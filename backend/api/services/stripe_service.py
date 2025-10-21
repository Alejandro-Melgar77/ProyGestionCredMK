# api/services/stripe_service.py
import stripe
from django.conf import settings
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class StripeService:
    def __init__(self):
        # Configurar Stripe con la clave secreta
        self.stripe = stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
    def crear_payment_intent(self, monto, moneda='bob', descripcion='', metadatos=None):
        """
        Crear un PaymentIntent en Stripe
        Returns: dict con estado, client_secret, etc.
        """
        try:
            # Convertir monto a centavos (Stripe usa enteros)
            monto_centavos = int(Decimal(str(monto)) * 100)
            
            logger.info(f"💳 Creando PaymentIntent: {monto} {moneda} -> {monto_centavos} centavos")
            
            intent = stripe.PaymentIntent.create(
                amount=monto_centavos,
                currency=moneda,
                description=descripcion[:22],  # Stripe limita a 22 caracteres
                metadata=metadatos or {},
                # Configuración adicional para tarjetas
                payment_method_types=['card'],
                capture_method='automatic',
            )
            
            logger.info(f"✅ PaymentIntent creado: {intent.id}")
            
            return {
                'estado': 'requiere_confirmacion',
                'id_intento': intent.id,
                'client_secret': intent.client_secret,
                'monto': str(monto),
                'moneda': moneda
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"❌ Error de Stripe: {str(e)}")
            return {
                'estado': 'error',
                'mensaje': f'Error de Stripe: {str(e)}'
            }
        except Exception as e:
            logger.error(f"❌ Error inesperado: {str(e)}")
            return {
                'estado': 'error',
                'mensaje': f'Error inesperado: {str(e)}'
            }
    
    def confirmar_payment_intent(self, payment_intent_id):
        """
        Confirmar que un PaymentIntent fue exitoso
        """
        try:
            logger.info(f"🔍 Verificando PaymentIntent: {payment_intent_id}")
            
            # Recuperar el PaymentIntent
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            logger.info(f"📊 Estado del PaymentIntent: {intent.status}")
            
            if intent.status == 'succeeded':
                # Buscar el charge asociado
                charges = stripe.Charge.list(payment_intent=payment_intent_id, limit=1)
                charge = charges.data[0] if charges.data else None
                
                codigo_autorizacion = charge.id if charge else intent.id
                
                logger.info(f"✅ Pago exitoso: {intent.id}")
                
                return {
                    'estado': 'aprobado',
                    'codigo_autorizacion': codigo_autorizacion,
                    'referencia': f"STRIPE-{intent.id[-8:].upper()}",
                    'datos_adicionales': {
                        'stripe_payment_intent': intent.id,
                        'stripe_charge_id': charge.id if charge else None,
                        'monto_pagado': intent.amount_received / 100,
                        'moneda': intent.currency,
                        'estado': intent.status
                    }
                }
            elif intent.status in ['processing', 'requires_capture']:
                logger.info(f"⏳ Pago en proceso: {intent.status}")
                return {
                    'estado': 'procesando',
                    'mensaje': f'El pago está {intent.status}'
                }
            else:
                logger.warning(f"⚠️ Pago no exitoso. Estado: {intent.status}")
                return {
                    'estado': 'fallido',
                    'mensaje': f'El pago falló con estado: {intent.status}'
                }
                
        except stripe.error.StripeError as e:
            logger.error(f"❌ Error de Stripe al confirmar: {str(e)}")
            return {
                'estado': 'error',
                'mensaje': f'Error de Stripe: {str(e)}'
            }
        except Exception as e:
            logger.error(f"❌ Error inesperado al confirmar: {str(e)}")
            import traceback
            logger.error(f"📋 Traceback: {traceback.format_exc()}")
            return {
                'estado': 'error',
                'mensaje': f'Error inesperado: {str(e)}'
            }
    
    def obtener_metodos_pago(self, payment_intent_id):
        """
        Obtener información de los métodos de pago usados
        """
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            payment_method_id = intent.payment_method
            
            if not payment_method_id:
                return None
                
            payment_method = stripe.PaymentMethod.retrieve(payment_method_id)
            
            if payment_method.type == 'card':
                card = payment_method.card
                return {
                    'tarjeta': {
                        'marca': card.brand,
                        'ultimos4': card.last4,
                        'pais': card.country,
                        'tipo': card.funding,
                        'expiracion_mes': card.exp_month,
                        'expiracion_anio': card.exp_year
                    }
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error al obtener métodos de pago: {e}")
            return None

    def crear_payment_intent_test(self, monto, moneda='bob'):
        """
        Método de prueba para simular creación de PaymentIntent
        Útil cuando Stripe no está configurado completamente
        """
        import uuid
        payment_intent_id = f"pi_test_{uuid.uuid4().hex[:24]}"
        client_secret = f"pi_test_{uuid.uuid4().hex}_secret_{uuid.uuid4().hex[:16]}"
        
        logger.info(f"🧪 PaymentIntent de prueba: {payment_intent_id}")
        
        return {
            'estado': 'requiere_confirmacion',
            'id_intento': payment_intent_id,
            'client_secret': client_secret,
            'monto': str(monto),
            'moneda': moneda
        }