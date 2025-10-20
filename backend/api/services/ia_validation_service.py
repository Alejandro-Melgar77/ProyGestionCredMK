# backend/api/services/ia_validation_service.py
import os
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import io
import re
from datetime import datetime

class TesseractOCRService:
    def __init__(self):
        self.supported_languages = ['eng']  # Por ahora solo inglés
        print("🔄 Inicializando servicio OCR mejorado...")
    
    def extract_text_from_document(self, document_file):
        """Extrae texto de documentos - versión mejorada"""
        try:
            if not document_file:
                return ""
            
            if hasattr(document_file, 'seek'):
                document_file.seek(0)
            
            image_data = document_file.read()
            if not image_data:
                return ""
                
            image = Image.open(io.BytesIO(image_data))
            processed_image = self.preprocess_image(image)
            
            custom_config = r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
            
            try:
                text = pytesseract.image_to_string(processed_image, lang='eng', config=custom_config)
                return text.strip()
            except Exception as e:
                print(f"❌ Error en OCR: {e}")
                return ""
            
        except Exception as e:
            print(f"❌ Error crítico en OCR: {e}")
            return ""
    
    def analyze_document_content(self, document_type, extracted_text, document_file=None):
        """Analiza el contenido específico según el tipo de documento"""
        text_lower = extracted_text.lower() if extracted_text else ""
        analysis = {
            'has_text': bool(extracted_text and len(extracted_text) > 10),
            'text_length': len(extracted_text) if extracted_text else 0,
            'word_count': len(extracted_text.split()) if extracted_text else 0,
            'relevant_keywords': [],
            'validation_errors': [],
            'document_score': 0.0,
            'content_analysis': {}
        }
        
        # Análisis específico por tipo de documento
        doc_type_name = document_type.nombre.lower() if hasattr(document_type, 'nombre') else str(document_type).lower()
        
        if 'identificacion' in doc_type_name or 'dni' in doc_type_name or 'carnet' in doc_type_name:
            analysis = self._analyze_id_document(text_lower, analysis)
        elif 'recibo' in doc_type_name or 'sueldo' in doc_type_name or 'pago' in doc_type_name:
            analysis = self._analyze_payroll_document(text_lower, analysis)
        elif 'servicio' in doc_type_name or 'luz' in doc_type_name or 'agua' in doc_type_name:
            analysis = self._analyze_utility_document(text_lower, analysis)
        elif 'constancia' in doc_type_name or 'trabajo' in doc_type_name:
            analysis = self._analyze_employment_document(text_lower, analysis)
        else:
            analysis = self._analyze_general_document(text_lower, analysis)
        
        # Calcular score final del documento
        analysis['document_score'] = self._calculate_document_score(analysis)
        
        return analysis
    
    def _analyze_id_document(self, text, analysis):
        """Analiza documentos de identificación"""
        id_keywords = ['dni', 'identity', 'national', 'id', 'document', 'number', 'birth', 'date']
        found_keywords = [kw for kw in id_keywords if kw in text]
        
        analysis['relevant_keywords'] = found_keywords
        analysis['content_analysis']['document_type'] = 'identification'
        
        # Validaciones específicas para ID
        if len(found_keywords) < 2:
            analysis['validation_errors'].append("Faltan keywords de identificación")
        
        # Buscar patrones de números de identificación
        id_patterns = [
            r'\b\d{8,12}\b',  # DNI patterns
            r'\b[A-Z0-9]{6,12}\b'  # Generic ID patterns
        ]
        
        id_numbers = []
        for pattern in id_patterns:
            id_numbers.extend(re.findall(pattern, text))
        
        analysis['content_analysis']['id_numbers_found'] = id_numbers
        analysis['content_analysis']['has_id_number'] = len(id_numbers) > 0
        
        return analysis
    
    def _analyze_payroll_document(self, text, analysis):
        """Analiza recibos de sueldo"""
        payroll_keywords = ['salary', 'payroll', 'wage', 'income', 'payment', 'net', 'gross', 'deduction']
        found_keywords = [kw for kw in payroll_keywords if kw in text]
        
        analysis['relevant_keywords'] = found_keywords
        analysis['content_analysis']['document_type'] = 'payroll'
        
        # Buscar montos de dinero
        money_patterns = [
            r'\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?',  # $ format
            r'\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|Bs|€|£)?\b'  # Generic money
        ]
        
        amounts = []
        for pattern in money_patterns:
            amounts.extend(re.findall(pattern, text))
        
        analysis['content_analysis']['amounts_found'] = amounts
        analysis['content_analysis']['has_amounts'] = len(amounts) > 0
        
        if len(found_keywords) < 2:
            analysis['validation_errors'].append("No parece ser un recibo de sueldo válido")
        
        return analysis
    
    def _analyze_utility_document(self, text, analysis):
        """Analiza recibos de servicios"""
        utility_keywords = ['electric', 'water', 'gas', 'utility', 'service', 'bill', 'invoice', 'payment']
        found_keywords = [kw for kw in utility_keywords if kw in text]
        
        analysis['relevant_keywords'] = found_keywords
        analysis['content_analysis']['document_type'] = 'utility'
        
        # Buscar fechas y montos
        date_pattern = r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b'
        dates = re.findall(date_pattern, text)
        
        analysis['content_analysis']['dates_found'] = dates
        analysis['content_analysis']['has_dates'] = len(dates) > 0
        
        if len(found_keywords) < 1:
            analysis['validation_errors'].append("No se identificó como recibo de servicio")
        
        return analysis
    
    def _analyze_employment_document(self, text, analysis):
        """Analiza constancias de trabajo"""
        employment_keywords = ['employment', 'work', 'job', 'company', 'employer', 'position', 'contract']
        found_keywords = [kw for kw in employment_keywords if kw in text]
        
        analysis['relevant_keywords'] = found_keywords
        analysis['content_analysis']['document_type'] = 'employment'
        
        # Buscar nombres de empresas y posiciones
        company_indicators = ['inc', 'ltd', 'corp', 'company', 'enterprise']
        has_company = any(indicator in text for indicator in company_indicators)
        
        analysis['content_analysis']['has_company_info'] = has_company
        
        if len(found_keywords) < 2:
            analysis['validation_errors'].append("No se identifica como constancia laboral")
        
        return analysis
    
    def _analyze_general_document(self, text, analysis):
        """Análisis para documentos generales"""
        # Keywords generales que indican documentos formales
        general_keywords = ['date', 'name', 'address', 'signature', 'official', 'document']
        found_keywords = [kw for kw in general_keywords if kw in text]
        
        analysis['relevant_keywords'] = found_keywords
        analysis['content_analysis']['document_type'] = 'general'
        
        # Validar que tenga estructura de documento
        lines = text.split('\n')
        non_empty_lines = [line.strip() for line in lines if line.strip()]
        
        analysis['content_analysis']['line_count'] = len(non_empty_lines)
        analysis['content_analysis']['has_structure'] = len(non_empty_lines) >= 3
        
        if len(non_empty_lines) < 2:
            analysis['validation_errors'].append("Estructura de documento muy básica")
        
        return analysis
    
    def _calculate_document_score(self, analysis):
        """Calcula el score del documento basado en múltiples factores"""
        score = 0.0
        
        # Factor 1: Presencia de texto (40%)
        if analysis['has_text']:
            score += 0.4
        
        # Factor 2: Longitud del texto (20%)
        if analysis['text_length'] > 100:
            score += 0.2
        elif analysis['text_length'] > 50:
            score += 0.1
        
        # Factor 3: Keywords relevantes (20%)
        keyword_score = min(0.2, len(analysis['relevant_keywords']) * 0.05)
        score += keyword_score
        
        # Factor 4: Validaciones específicas (20%)
        if not analysis['validation_errors']:
            score += 0.2
        elif len(analysis['validation_errors']) == 1:
            score += 0.1
        
        # Penalización por errores
        error_penalty = len(analysis['validation_errors']) * 0.1
        score = max(0.1, score - error_penalty)
        
        return round(score, 2)
    
    def preprocess_image(self, image):
        """Preprocesa la imagen para mejorar OCR"""
        try:
            if image.mode != 'L':
                image = image.convert('L')
            
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.5)
            
            return image
        except Exception as e:
            print(f"⚠️ Error en preprocesamiento: {e}")
            return image

class CreditScoringService:
    def __init__(self):
        self.model = None
        self.load_or_train_model()
    
    def load_or_train_model(self):
        """Carga o entrena el modelo de scoring"""
        try:
            # Lógica existente para cargar/entrenar modelo
            self.model = None  # Por simplicidad, usaremos solo reglas por ahora
        except Exception as e:
            print(f"⚠️ Error con modelo ML: {e}")
            self.model = None
    
    def analyze_credit_risk(self, solicitud_data, documentos_data):
        """Analiza el riesgo crediticio considerando el análisis detallado de documentos"""
        print("🧮 Iniciando análisis de riesgo crediticio mejorado...")
        
        risk_factors = []
        positive_factors = []
        
        # Obtener datos de la solicitud
        ingreso_mensual = solicitud_data.get('ingresos_mensuales', 0)
        monto_solicitado = solicitud_data.get('monto', 0)
        plazo_meses = solicitud_data.get('plazo_meses', 12)
        tipo_trabajador = solicitud_data.get('tipo_trabajador', '')
        edad = solicitud_data.get('edad', 35)
        
        # Score base basado en reglas mejoradas
        score_global = self.calculate_rule_based_score(solicitud_data, documentos_data)
        
        # Análisis detallado de documentos
        doc_analysis = documentos_data.get('detailed_analysis', {})
        avg_doc_score = documentos_data.get('score_promedio', 0.5)
        
        # Factores basados en calidad de documentos
        if avg_doc_score < 0.3:
            risk_factors.append("Documentación de muy baja calidad o ilegible")
            score_global *= 0.7  # Penalización fuerte
        elif avg_doc_score < 0.6:
            risk_factors.append("Problemas de calidad en documentación")
            score_global *= 0.9  # Penalización moderada
        elif avg_doc_score > 0.8:
            positive_factors.append("Documentación completa y de alta calidad")
            score_global *= 1.1  # Bonificación
        
        # Factores de ingresos y capacidad de pago
        if ingreso_mensual > 0:
            relacion_cuota_ingreso = (monto_solicitado / plazo_meses) / ingreso_mensual
            
            if relacion_cuota_ingreso > 0.7:
                risk_factors.append("Cuota mensual muy alta en relación a ingresos")
                score_global *= 0.6
            elif relacion_cuota_ingreso > 0.5:
                risk_factors.append("Cuota mensual alta en relación a ingresos")
                score_global *= 0.8
            elif relacion_cuota_ingreso < 0.3:
                positive_factors.append("Buena capacidad de pago")
        
        # Factores de tipo de trabajador
        if tipo_trabajador == 'INDEPENDIENTE':
            risk_factors.append("Trabajador independiente (riesgo mayor)")
            score_global *= 0.9
        elif tipo_trabajador == 'PUBLICO':
            positive_factors.append("Trabajador público (estabilidad)")
        
        # Factores de edad
        if edad < 25:
            risk_factors.append("Edad muy joven (menos experiencia crediticia)")
            score_global *= 0.9
        elif edad > 60:
            risk_factors.append("Edad avanzada (menor capacidad de ingreso futuro)")
            score_global *= 0.9
        
        # Asegurar que el score esté entre 0 y 1
        score_global = max(0.1, min(0.99, score_global))
        
        # Determinar recomendación basada en score ajustado
        if score_global >= 0.7:
            recomendacion = "APROBAR"
        elif score_global >= 0.5:
            recomendacion = "REVISAR_MANUAL"
        else:
            recomendacion = "RECHAZAR"
        
        print(f"📊 Score global final: {score_global:.2f}")
        print(f"📋 Factores de riesgo: {risk_factors}")
        print(f"✅ Factores positivos: {positive_factors}")
        
        return {
            'score_global': float(score_global),
            'recomendacion': recomendacion,
            'factores_riesgo': risk_factors,
            'factores_positivos': positive_factors,
            'confianza_modelo': 0.8,
            'detalles_analisis': {
                'modelo_usado': 'reglas_mejoradas',
                'timestamp': datetime.now().isoformat(),
                'version': '2.0'
            }
        }
    
    def calculate_rule_based_score(self, solicitud_data, documentos_data):
        """Calcula score basado en reglas mejoradas"""
        score = 0.5
        
        # Factor documentos (40% peso)
        doc_score = documentos_data.get('score_promedio', 0.5)
        score += (doc_score - 0.5) * 0.4
        
        # Factor ingresos (30% peso)
        ingreso_mensual = solicitud_data.get('ingresos_mensuales', 0)
        if ingreso_mensual >= 3000:
            score += 0.3
        elif ingreso_mensual >= 1500:
            score += 0.15
        elif ingreso_mensual >= 800:
            score += 0.05
        
        # Factor tipo trabajador (15% peso)
        tipo_trabajador = solicitud_data.get('tipo_trabajador', '')
        if tipo_trabajador == 'PUBLICO':
            score += 0.15
        elif tipo_trabajador == 'PRIVADO':
            score += 0.1
        elif tipo_trabajador == 'INDEPENDIENTE':
            score += 0.05
        
        # Factor edad (15% peso)
        edad = solicitud_data.get('edad', 35)
        if 30 <= edad <= 50:
            score += 0.15
        elif 25 <= edad < 30 or 50 < edad <= 60:
            score += 0.1
        else:
            score += 0.05
        
        return max(0.1, min(0.99, score))