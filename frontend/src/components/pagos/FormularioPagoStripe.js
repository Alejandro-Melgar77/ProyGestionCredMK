// components/pagos/FormularioPagoStripe.js
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { pagoService } from '../../services/pagoService';

// Configuración de Stripe - usa tu clave pública de prueba
const stripePromise = loadStripe('pk_test_51SKTrqHwD6XEzQHGrv5BhO2Vy9dzEGmnGrMki66qEN0J9AluwMFrXTkAXC0KbulFejX81u2JnC4tIQom9KetNtPS00l67fBQJb'); // Reemplaza con tu Stripe Publishable Key

const CheckoutForm = ({ cuota, onCancelar, onExitoso }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [paymentIntent, setPaymentIntent] = useState(null);

  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (!stripe || !elements) {
      setError('Stripe no está cargado correctamente');
      setLoading(false);
      return;
    }

    try {
      // 1. Crear PaymentIntent en el backend
      let intentData;
      if (!paymentIntent) {
        const response = await pagoService.crearPaymentIntent({
          cuota_id: cuota.id,
          email_notificacion: email
        });

        if (response.data.estado !== 'requiere_confirmacion') {
          throw new Error(response.data.mensaje || 'Error al crear el pago');
        }

        intentData = response.data;
        setPaymentIntent(intentData);
      } else {
        intentData = paymentIntent;
      }

      // 2. Confirmar el pago con Stripe
      const cardElement = elements.getElement(CardElement);
      
      const { error: stripeError, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
        intentData.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: email,
              name: 'Cliente Financiero', // Podrías obtener el nombre del usuario
            },
          },
        }
      );

      if (stripeError) {
        setError(`❌ ${stripeError.message}`);
        setLoading(false);
        return;
      }

      if (confirmedIntent.status === 'succeeded') {
        // 3. Confirmar el pago en nuestro backend
        const confirmResponse = await pagoService.confirmarPago({
          payment_intent_id: confirmedIntent.id,
          cuota_id: cuota.id
        });

        if (confirmResponse.data.estado === 'exitoso') {
          alert(`✅ ¡Pago exitoso!\nCódigo: ${confirmResponse.data.codigo_autorizacion}\nReferencia: ${confirmResponse.data.referencia}`);
          onExitoso();
        } else {
          setError(`❌ ${confirmResponse.data.mensaje || 'Error al confirmar el pago'}`);
        }
      } else {
        setError(`❌ El pago no fue exitoso. Estado: ${confirmedIntent.status}`);
      }

    } catch (error) {
      const errorMessage = error.response?.data?.error?.[0] || 
                          error.response?.data?.mensaje || 
                          error.message || 
                          'Error al procesar el pago';
      setError(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content pago-modal">
        <div className="modal-header">
          <h3>💳 Pagar Cuota {cuota.nro_cuota}</h3>
          <button onClick={onCancelar} className="btn-close">×</button>
        </div>

        <div className="pago-info">
          <div className="info-item">
            <strong>Producto:</strong> {cuota.producto_info.nombre}
          </div>
          <div className="info-item">
            <strong>Monto a pagar:</strong> Bs. {parseFloat(cuota.cuota).toFixed(2)}
          </div>
          <div className="info-item">
            <strong>Vencimiento:</strong> {new Date(cuota.fecha_vencimiento).toLocaleDateString()}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="formulario-pago">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Email para recibo (opcional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label>Información de la Tarjeta</label>
            <div className="stripe-card-element">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                      padding: '10px 12px',
                    },
                  },
                  hidePostalCode: true,
                }}
              />
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={onCancelar}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={!stripe || loading}
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Procesando...
                </>
              ) : (
                `Pagar Bs. ${parseFloat(cuota.cuota).toFixed(2)}`
              )}
            </button>
          </div>
        </form>

        <div className="pago-seguro">
          <p>🔒 Pago seguro mediante Stripe</p>
          <div className="logos-pasarelas">
            <span className="logo visa">VISA</span>
            <span className="logo mastercard">Mastercard</span>
            <span className="logo amex">Amex</span>
            <span className="logo discover">Discover</span>
          </div>
          <div className="test-info">
            <p><strong>💡 Modo Pruebas:</strong> Usa tarjetas de prueba de Stripe</p>
            <small>Ej: 4242 4242 4242 4242 - Cualquier fecha futura - Cualquier CVC</small>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente wrapper con Elements provider
const FormularioPagoStripe = (props) => (
  <Elements stripe={stripePromise}>
    <CheckoutForm {...props} />
  </Elements>
);

export default FormularioPagoStripe;