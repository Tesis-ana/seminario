# Standard library imports
import json
import random
import pickle
from glob import glob

import os
# 0 = mostrar todo, 1 = filtrar INFO, 2 = filtrar INFO+WARNING, 3 = filtrar INFO+WARNING+ERROR 
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import warnings
# Suprime todas las warnings de Python
warnings.filterwarnings('ignore')

# Opcional: refina solo ciertos módulos
warnings.filterwarnings('ignore', category=UserWarning, module='h5py')
warnings.filterwarnings('ignore', category=UserWarning, module='xgboost')
warnings.filterwarnings('ignore', category=DeprecationWarning)

# También baja el nivel del logger de TensorFlow/keras
import logging
logging.getLogger('tensorflow').setLevel(logging.ERROR)
logging.getLogger('keras').setLevel(logging.ERROR)

# Si usas la capa de logging de absl (TF2+), pon:
try:
    import absl.logging
    absl.logging.set_verbosity(absl.logging.ERROR)
except ImportError:
    pass

# Third-party imports
import numpy as np
import pandas as pd
import six

# Image processing
import cv2
from PIL import Image
import SimpleITK as sitk
import nrrd

# Machine Learning
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import RandomOverSampler
from xgboost import XGBClassifier
import radiomics
from joblib import load

# Deep Learning - TensorFlow/Keras
import tensorflow as tf
import tensorflow.keras.backend as K
from tensorflow.keras.models import load_model
from tensorflow.keras.layers import Conv2D, Multiply, Layer
from tensorflow.keras.preprocessing.image import load_img, img_to_array

# Visualization
import matplotlib.pyplot as plt
from tqdm import tqdm
import argparse
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'modelos')
IMGS_DIR = os.path.join(BASE_DIR, 'predicts', 'imgs')
MASKS_DIR = os.path.join(BASE_DIR, 'predicts', 'masks')

model_path = os.path.join(MODEL_DIR ,'best_model.keras') 


with open(os.path.join(MODEL_DIR,"Categoria3.pkl"), "rb") as f:
    Categoria3 = pickle.load(f)
Categoria4=load(os.path.join(MODEL_DIR,"Categoria4.joblib"))
Categoria5=load(os.path.join(MODEL_DIR,"Categoria5.joblib"))
with open(os.path.join(MODEL_DIR,"Categoria6.pkl"), "rb") as f:
    Categoria6 = pickle.load(f)
Categoria7=load(os.path.join(MODEL_DIR,"Categoria7.joblib"))
Categoria8=load(os.path.join(MODEL_DIR,"Categoria8.joblib"))

class SpatialAttention(Layer):
    def __init__(self, kernel_size=7, filters=1, activation='sigmoid', **kwargs):
        super(SpatialAttention, self).__init__(**kwargs)
        self.kernel_size = kernel_size
        self.filters = filters
        self.activation = activation

    def build(self, input_shape):
        self.conv1 = Conv2D(
            filters=self.filters,
            kernel_size=self.kernel_size,
            padding='same',
            activation=self.activation,
            kernel_initializer='he_normal',
            use_bias=False
        )
        super(SpatialAttention, self).build(input_shape)

    def call(self, inputs):
        attention = self.conv1(inputs)
        return Multiply()([inputs, attention])

    def get_config(self):
        config = super(SpatialAttention, self).get_config()
        config.update({
            'kernel_size': self.kernel_size,
            'filters': self.filters,
            'activation': self.activation
        })
        return config


def dice_coefficient(y_true, y_pred):
    smooth = 1e-6
    y_true = tf.cast(y_true, tf.float32)
    y_pred = tf.cast(y_pred, tf.float32)
    y_true_f = K.flatten(y_true)
    y_pred_f = K.flatten(y_pred)
    intersection = K.sum(y_true_f * y_pred_f)
    return (2. * intersection + smooth) / (K.sum(y_true_f) + K.sum(y_pred_f) + smooth)

def precision_metric(y_true, y_pred):
    y_true = tf.cast(y_true, tf.float32)
    y_pred = tf.cast(y_pred, tf.float32)
    true_positives = K.sum(K.round(K.clip(y_true * y_pred, 0, 1)))
    predicted_positives = K.sum(K.round(K.clip(y_pred, 0, 1)))
    return true_positives / (predicted_positives + K.epsilon())

def recall_metric(y_true, y_pred):
    y_true = tf.cast(y_true, tf.float32)
    y_pred = tf.cast(y_pred, tf.float32)
    true_positives = K.sum(K.round(K.clip(y_true * y_pred, 0, 1)))
    possible_positives = K.sum(K.round(K.clip(y_true, 0, 1)))
    return true_positives / (possible_positives + K.epsilon())

def f1_score(y_true, y_pred):
    prec = precision_metric(y_true, y_pred)
    rec = recall_metric(y_true, y_pred)
    return 2.0 * ((prec * rec) / (prec + rec + K.epsilon()))

def iou_metric(y_true, y_pred):
    y_true = tf.cast(y_true, tf.float32)
    y_pred = tf.cast(y_pred, tf.float32)
    y_true_bin = K.cast(K.greater(y_true, 0.5), K.floatx())
    y_pred_bin = K.cast(K.greater(y_pred, 0.5), K.floatx())
    intersection = K.sum(y_true_bin * y_pred_bin)
    union = K.sum(y_true_bin) + K.sum(y_pred_bin) - intersection
    return intersection / (union + K.epsilon())

def focal_tversky_loss(y_true, y_pred, alpha=0.7, beta=0.3, gamma=4/3):
    y_true = tf.cast(y_true, tf.float32)
    y_pred = tf.cast(y_pred, tf.float32)

    tp = K.sum(y_true * y_pred, axis=[1,2,3])
    fp = K.sum((1-y_true) * y_pred, axis=[1,2,3])
    fn = K.sum(y_true * (1-y_pred), axis=[1,2,3])

    tversky = (tp + K.epsilon()) / (tp + alpha*fp + beta*fn + K.epsilon())
    focal_tversky = K.pow((1 - tversky), gamma)

    return K.mean(focal_tversky)

def combined_loss(y_true, y_pred):
    return focal_tversky_loss(y_true, y_pred) + tf.keras.losses.BinaryCrossentropy()(y_true, y_pred)

# 3. Cargar el modelo
# Definir el directorio de salida (modifica esta ruta según tus necesidades)
output_dir = './predicts'
os.makedirs(output_dir, exist_ok=True)

# Directorio para guardar las predicciones
predictions_dir = os.path.join(output_dir, "masks")
os.makedirs(predictions_dir, exist_ok=True)

# Cargar el modelo con las capas y funciones personalizadas
model = load_model(model_path, custom_objects={
    'SpatialAttention': SpatialAttention,
    'dice_coefficient': dice_coefficient,
    'iou_metric': iou_metric,
    'precision_metric': precision_metric,
    'recall_metric': recall_metric,
    'f1_score': f1_score,
    'combined_loss': combined_loss,
    'focal_tversky_loss': focal_tversky_loss
})

# 4. Definir funciones de preprocesamiento
def load_and_preprocess_image(image_path, target_size=(256, 256)):
    """
    Carga y preprocesa una imagen.

    Args:
        image_path (str): Ruta a la imagen.
        target_size (tuple): Tamaño al que redimensionar la imagen.

    Returns:
        np.array: Imagen preprocesada.
    """
    try:
        img = Image.open(image_path).convert('RGB')
    except Exception as e:
        print(f"Error al abrir la imagen {image_path}: {e}")
        return None
    img = img.resize(target_size)
    img = np.array(img)
    img = img / 255.0  # Normalización
    return img

def load_and_preprocess_mask(mask_path, target_size=(256, 256)):
    """
    Carga y preprocesa una máscara.

    Args:
        mask_path (str): Ruta a la máscara.
        target_size (tuple): Tamaño al que redimensionar la máscara.

    Returns:
        np.array: Máscara preprocesada.
    """
    try:
        mask = Image.open(mask_path).convert('L')  # Escala de grises
    except Exception as e:
        print(f"Error al abrir la máscara {mask_path}: {e}")
        return None
    mask = mask.resize(target_size)
    mask = np.array(mask)
    mask = (mask > 127).astype(np.float32)  # Binarización
    mask = np.expand_dims(mask, axis=-1)
    return mask

def prepare_image_for_prediction(image):
    """
    Prepara la imagen para la predicción añadiendo una dimensión de batch.

    Args:
        image (np.array): Imagen preprocesada.

    Returns:
        np.array: Imagen con dimensión de batch.
    """
    return np.expand_dims(image, axis=0)

def predict_mask(model, image):
    """
    Genera la máscara de predicción para una imagen dada.

    Args:
        model (tf.keras.Model): Modelo cargado.
        image (np.array): Imagen preprocesada.

    Returns:
        np.array: Máscara de predicción.
    """
    preprocessed_image = prepare_image_for_prediction(image)
    pred_mask = model.predict(preprocessed_image, verbose=0)
    pred_mask = np.squeeze(pred_mask, axis=0)
    
    return pred_mask


def postprocess_mask(pred_mask, threshold=0.5):
    """
    Binariza la máscara de predicción utilizando un umbral.

    Args:
        pred_mask (np.array): Máscara de predicción.
        threshold (float): Umbral para binarización.

    Returns:
        np.array: Máscara binarizada.
    """
    return (pred_mask > threshold).astype(np.float32)

# 5. Definir funciones de visualización y guardado
def visualize_prediction(original_image, true_mask, pred_mask, postprocessed_mask, save_path=None):
    """
    Visualiza y opcionalmente guarda la imagen original, máscara verdadera,
    máscara de predicción y máscara postprocesada.

    Args:
        original_image (np.array): Imagen original.
        true_mask (np.array): Máscara verdadera.
        pred_mask (np.array): Máscara de predicción.
        postprocessed_mask (np.array): Máscara postprocesada.
        save_path (str, optional): Ruta para guardar la visualización.
    """
    fig, axes = plt.subplots(1, 4, figsize=(20, 5))

    axes[0].imshow(original_image)
    axes[0].set_title("Imagen Original")
    axes[0].axis('off')

    axes[1].imshow(true_mask.squeeze(), cmap='gray')
    axes[1].set_title("Máscara Verdadera")
    axes[1].axis('off')

    axes[2].imshow(pred_mask.squeeze(), cmap='gray')
    axes[2].set_title("Máscara de Predicción")
    axes[2].axis('off')

    axes[3].imshow(postprocessed_mask.squeeze(), cmap='gray')
    axes[3].set_title("Máscara Postprocesada")
    axes[3].axis('off')

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path)
    plt.show()

def save_mask(pred_mask, save_path):
    """
    Guarda la máscara de predicción como una imagen.

    Args:
        pred_mask (np.array): Máscara postprocesada.
        save_path (str): Ruta para guardar la máscara.
    """
    mask = (pred_mask * 255).astype(np.uint8)
    mask_image = Image.fromarray(mask.squeeze(), mode='L')
    mask_image.save(save_path)

def predecir_mascara(imagen_path, modelo=model, target_size=(256, 256), threshold=0.5):
    imagen = load_and_preprocess_image(imagen_path, target_size=target_size)
    if imagen is None:
        raise ValueError(f"No se pudo cargar la imagen: {imagen_path}")
    prediccion = predict_mask(modelo, imagen)

    mascara_predicha = postprocess_mask(prediccion, threshold=threshold)
    nombre_archivo = os.path.basename(imagen_path)
    nombre_base, _ = os.path.splitext(nombre_archivo)
    ruta_mascara = os.path.join(predictions_dir, f"{nombre_base}.jpg")
    save_mask(mascara_predicha, ruta_mascara)
    return ruta_mascara

def predecir(image_path, mask_path):

    # Silenciar los mensajes no deseados de PyRadiomics
    logging.getLogger('radiomics').setLevel(logging.ERROR)

    extractor = radiomics.featureextractor.RadiomicsFeatureExtractor()

    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    mask = (mask / np.max(mask)).astype(int)

    img = cv2.resize(img, (256, 256))
    mask = cv2.resize(mask, (256, 256))

    nrrd.write(image_path.replace(".jpg", '.nrrd'), img)
    nrrd.write(mask_path.replace(".jpg", '.nrrd'), mask)

    result = extractor.execute(image_path.replace(".jpg", '.nrrd'), mask_path.replace(".jpg", '.nrrd'))

    # 5. Lista de claves a excluir
    keys_to_exclude = [
        'diagnostics_Versions_PyRadiomics',
        'diagnostics_Versions_Numpy',
        'diagnostics_Versions_SimpleITK',
        'diagnostics_Versions_PyWavelet',
        'diagnostics_Versions_Python',
        'diagnostics_Configuration_Settings',
        'diagnostics_Image-original_Spacing',
        'diagnostics_Image-original_Size',
        'diagnostics_Image-original_Mean',
        'diagnostics_Image-original_Minimum',
        'diagnostics_Image-original_Maximum',
        'diagnostics_Mask-original_Hash',
        'diagnostics_Mask-original_Spacing',
        'diagnostics_Mask-original_Size',
        'diagnostics_Configuration_EnabledImageTypes',
        'diagnostics_Image-original_Hash',
        'diagnostics_Image-original_Dimensionality',
        'diagnostics_Mask-original_CenterOfMass',
        'diagnostics_Mask-original_BoundingBox',
        'diagnostics_Mask-original_CenterOfMassIndex'
    ]

    # 6. Filtrar el diccionario 'result'
    filtered_features = {
        k: v
        for k, v in result.items()
        if k not in keys_to_exclude
    }

    # 7. Construir el diccionario final
    filtered_data = {
        'imagen': os.path.basename(image_path),
        **filtered_features
    }
    df = pd.DataFrame([filtered_data])

    df = df.drop(['imagen'], axis=1)
    df = df.drop(df.columns[:2], axis=1)

    modelos = [Categoria3, Categoria4, Categoria5, Categoria6, Categoria7, Categoria8]
    resultados = []
    for i, z in zip(modelos, range(3, 9)):
        try:
            prediccion = i.predict(df.values)  # Usar .values elimina los nombres de columnas
            resultados.append(int(prediccion[0]))
        except Exception as e:
            print(f"Hubo un error con la categoria: {z}")
            print(f"Error: {e}")
    categories = ["Cat3", "Cat4", "Cat5", "Cat6", "Cat7", "Cat8"]
    results_dict = {}
    for c, r in zip(categories, resultados):
        results_dict[c] = r[0] if hasattr(r, "__getitem__") else r
    print(json.dumps(results_dict))
    
def mask_precit(image_path):
    mask_path= predecir_mascara(image_path)
    predecir(image_path,mask_path)

# mask_precit('./predicts/imgs/mar4.jpg')
# predecir_mascara('./predicts/imgs/mar4 copy.jpg')
# predecir('./predicts/imgs/mar4 copy.jpg','./predicts/masks/mar4 copy.jpg')

if __name__ == "__main__":

    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", required=True, choices=["mask_precit", "predecir_mascara", "predecir"])
    parser.add_argument("--image_path", required=True)
    parser.add_argument("--mask_path", required=False)
    args = parser.parse_args()

    if args.mode == "mask_precit":
        mask_precit(args.image_path)
    elif args.mode == "predecir_mascara":
        result = predecir_mascara(args.image_path)
        print(f"Mask saved at: {result}")
    elif args.mode == "predecir":
        if not args.mask_path:
            raise ValueError("Favor de proporcionar la ruta de la máscara con --mask_path")
        if not args.image_path:
            raise ValueError("Favor de proporcionar la ruta de la imagen con --image_path")
        predecir(os.path.join(IMGS_DIR,args.image_path), os.path.join( MASKS_DIR,args.mask_path))