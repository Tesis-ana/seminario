import builtins
import importlib.util
import io
import json
import os
import sys
import types
from pathlib import Path

import pytest

CATEGORY_OUTPUTS = {
    "Categoria3.pkl": 3,
    "Categoria4.joblib": 4,
    "Categoria5.joblib": 5,
    "Categoria6.pkl": 6,
    "Categoria7.joblib": 7,
    "Categoria8.joblib": 8,
}


class FakeArray:
    def __init__(self, value):
        self.value = value

    def _apply(self, func):
        return FakeArray(func(self.value))

    def __truediv__(self, other):
        return self._apply(lambda data: data / other if other else data)

    def __mul__(self, other):
        return self._apply(lambda data: data * other)

    __rmul__ = __mul__

    def astype(self, dtype):
        converter = dtype if callable(dtype) else (lambda data: data)
        return self._apply(converter)

    def squeeze(self, axis=None):
        return self

    def max_value(self):
        return self.value

    def __repr__(self):
        return f"FakeArray({self.value})"


class FakeDataFrame:
    def __init__(self, rows):
        if not rows:
            raise ValueError("rows required")
        self._row = rows[0].copy()
        self.columns = list(self._row.keys())

    def drop(self, labels, axis=1):
        if axis != 1:
            raise NotImplementedError("axis other than 1 not supported in fake dataframe")
        if isinstance(labels, slice):
            labels = self.columns[labels]
        if not isinstance(labels, (list, tuple, set)):
            labels = [labels]
        filtered = {col: self._row[col] for col in self.columns if col not in labels}
        return FakeDataFrame([filtered])

    @property
    def values(self):
        return [[self._row[col] for col in self.columns]]


class FakeModel:
    def __init__(self, value):
        self.value = value
        self.inputs = []

    def predict(self, data):
        self.inputs.append(data)
        return [self.value]


class FakeSegmentationModel:
    def predict(self, image, verbose=0):
        return FakeArray(0.5)


class FakeAxis:
    def imshow(self, *args, **kwargs):
        return None

    def set_title(self, *args, **kwargs):
        return None

    def axis(self, *args, **kwargs):
        return None


def _install_stub_modules(monkeypatch, recorded):
    numpy_module = types.ModuleType("numpy")
    numpy_module.array = lambda value: FakeArray(value) if not isinstance(value, FakeArray) else value
    numpy_module.expand_dims = lambda value, axis=0: FakeArray(value)
    numpy_module.squeeze = lambda value, axis=None: value
    numpy_module.float32 = float
    numpy_module.uint8 = int
    numpy_module.max = lambda value: value.max_value() if isinstance(value, FakeArray) else value
    monkeypatch.setitem(sys.modules, "numpy", numpy_module)

    six_module = types.ModuleType("six")
    monkeypatch.setitem(sys.modules, "six", six_module)

    pandas_module = types.ModuleType("pandas")
    pandas_module.DataFrame = lambda rows: FakeDataFrame(rows)
    monkeypatch.setitem(sys.modules, "pandas", pandas_module)

    cv2_module = types.ModuleType("cv2")
    cv2_module.IMREAD_GRAYSCALE = 0

    def fake_imread(path, flag):
        recorded["imread_calls"].append(path)
        value = 200 if "mask" not in path else 100
        return FakeArray(value)

    cv2_module.imread = fake_imread
    cv2_module.resize = lambda array, size: array
    monkeypatch.setitem(sys.modules, "cv2", cv2_module)

    pil_module = types.ModuleType("PIL")
    pil_image_module = types.ModuleType("PIL.Image")

    class _StubPillowImage:
        def convert(self, mode):
            return self

        def resize(self, size):
            return self

        def save(self, path):
            recorded.setdefault("saved_images", []).append(path)

    pil_image_module.open = staticmethod(lambda path: _StubPillowImage())
    pil_image_module.fromarray = staticmethod(lambda array, mode=None: _StubPillowImage())
    pil_module.Image = pil_image_module
    monkeypatch.setitem(sys.modules, "PIL", pil_module)
    monkeypatch.setitem(sys.modules, "PIL.Image", pil_image_module)

    monkeypatch.setitem(sys.modules, "SimpleITK", types.ModuleType("SimpleITK"))

    nrrd_module = types.ModuleType("nrrd")

    def fake_nrrd_write(path, data):
        recorded["nrrd_writes"].append(path)

    nrrd_module.write = fake_nrrd_write
    monkeypatch.setitem(sys.modules, "nrrd", nrrd_module)

    sklearn_module = types.ModuleType("sklearn")
    sklearn_ensemble_module = types.ModuleType("sklearn.ensemble")
    sklearn_preprocessing_module = types.ModuleType("sklearn.preprocessing")

    class _FakeRandomForest:
        pass

    class _FakeScaler:
        pass

    sklearn_ensemble_module.RandomForestClassifier = _FakeRandomForest
    sklearn_preprocessing_module.StandardScaler = _FakeScaler
    monkeypatch.setitem(sys.modules, "sklearn", sklearn_module)
    monkeypatch.setitem(sys.modules, "sklearn.ensemble", sklearn_ensemble_module)
    monkeypatch.setitem(sys.modules, "sklearn.preprocessing", sklearn_preprocessing_module)

    imblearn_module = types.ModuleType("imblearn")
    over_sampling_module = types.ModuleType("imblearn.over_sampling")

    class _FakeRandomOverSampler:
        pass

    over_sampling_module.RandomOverSampler = _FakeRandomOverSampler
    monkeypatch.setitem(sys.modules, "imblearn", imblearn_module)
    monkeypatch.setitem(sys.modules, "imblearn.over_sampling", over_sampling_module)

    xgboost_module = types.ModuleType("xgboost")

    class _FakeXGBClassifier:
        pass

    xgboost_module.XGBClassifier = _FakeXGBClassifier
    monkeypatch.setitem(sys.modules, "xgboost", xgboost_module)

    radiomics_module = types.ModuleType("radiomics")
    featureextractor_module = types.ModuleType("radiomics.featureextractor")

    class _FakeExtractor:
        def __init__(self):
            recorded["extract_calls"].append(("init", None))

        def execute(self, image_path, mask_path):
            recorded["extract_calls"].append((image_path, mask_path))
            return {
                "diagnostics_Versions_PyRadiomics": "skip",
                "diagnostics_Image-original_Size": "skip",
                "feature_a": 0.1,
                "feature_b": 0.2,
                "feature_c": 0.3,
                "feature_d": 0.4,
            }

    featureextractor_module.RadiomicsFeatureExtractor = _FakeExtractor
    radiomics_module.featureextractor = featureextractor_module
    monkeypatch.setitem(sys.modules, "radiomics", radiomics_module)
    monkeypatch.setitem(sys.modules, "radiomics.featureextractor", featureextractor_module)

    joblib_module = types.ModuleType("joblib")

    def fake_joblib_load(path):
        filename = os.path.basename(path)
        value = CATEGORY_OUTPUTS.get(filename, 0)
        return FakeModel(value)

    joblib_module.load = fake_joblib_load
    monkeypatch.setitem(sys.modules, "joblib", joblib_module)

    tf_module = types.ModuleType("tensorflow")
    tf_module.float32 = float
    tf_module.cast = lambda value, dtype: value

    keras_module = types.ModuleType("tensorflow.keras")
    losses_module = types.ModuleType("tensorflow.keras.losses")
    losses_module.BinaryCrossentropy = lambda: (lambda y_true, y_pred: 0)
    backend_module = types.ModuleType("tensorflow.keras.backend")
    backend_module.flatten = lambda value: value
    backend_module.sum = lambda value, axis=None: 0
    backend_module.greater = lambda a, b: a
    backend_module.cast = lambda value, dtype: value
    backend_module.round = lambda value: value
    backend_module.clip = lambda value, min_value, max_value: value
    backend_module.pow = lambda value, power: value
    backend_module.epsilon = lambda: 1e-6

    class _FakeLayer:
        def __init__(self, *args, **kwargs):
            pass

        def build(self, input_shape):
            return None

    class _FakeConv2D(_FakeLayer):
        def __call__(self, inputs):
            return inputs

    class _FakeMultiply:
        def __call__(self, inputs):
            return inputs[0]

    models_module = types.ModuleType("tensorflow.keras.models")
    models_module.load_model = lambda *args, **kwargs: FakeSegmentationModel()
    layers_module = types.ModuleType("tensorflow.keras.layers")
    layers_module.Layer = _FakeLayer
    layers_module.Conv2D = _FakeConv2D
    layers_module.Multiply = _FakeMultiply
    tf_preprocessing_module = types.ModuleType("tensorflow.keras.preprocessing")
    image_module = types.ModuleType("tensorflow.keras.preprocessing.image")
    image_module.load_img = lambda path, target_size=None: path
    image_module.img_to_array = lambda image: image
    tf_preprocessing_module.image = image_module

    keras_module.losses = losses_module
    keras_module.backend = backend_module
    keras_module.models = models_module
    keras_module.layers = layers_module
    keras_module.preprocessing = tf_preprocessing_module
    tf_module.keras = keras_module

    monkeypatch.setitem(sys.modules, "tensorflow", tf_module)
    monkeypatch.setitem(sys.modules, "tensorflow.keras", keras_module)
    monkeypatch.setitem(sys.modules, "tensorflow.keras.models", models_module)
    monkeypatch.setitem(sys.modules, "tensorflow.keras.layers", layers_module)
    monkeypatch.setitem(sys.modules, "tensorflow.keras.preprocessing", tf_preprocessing_module)
    monkeypatch.setitem(sys.modules, "tensorflow.keras.preprocessing.image", image_module)
    monkeypatch.setitem(sys.modules, "tensorflow.keras.backend", backend_module)
    monkeypatch.setitem(sys.modules, "tensorflow.keras.losses", losses_module)

    matplotlib_module = types.ModuleType("matplotlib")
    plt_module = types.ModuleType("matplotlib.pyplot")
    plt_module.subplots = lambda rows, cols, figsize=None: (object(), [FakeAxis() for _ in range(rows * cols)])
    plt_module.tight_layout = lambda: None
    plt_module.show = lambda: None
    plt_module.savefig = lambda path: None
    matplotlib_module.pyplot = plt_module
    monkeypatch.setitem(sys.modules, "matplotlib", matplotlib_module)
    monkeypatch.setitem(sys.modules, "matplotlib.pyplot", plt_module)

    tqdm_module = types.ModuleType("tqdm")
    tqdm_module.tqdm = lambda iterable, *args, **kwargs: iterable
    monkeypatch.setitem(sys.modules, "tqdm", tqdm_module)


@pytest.fixture
def pwat(monkeypatch, tmp_path):
    recorded = {
        "nrrd_writes": [],
        "extract_calls": [],
        "imread_calls": [],
    }
    _install_stub_modules(monkeypatch, recorded)

    class _FakeBinaryFile(io.BytesIO):
        def __init__(self, name):
            super().__init__(b"stub")
            self.name = name

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            self.close()

    real_open = builtins.open

    def fake_open(path, mode="r", *args, **kwargs):
        if isinstance(path, str) and "Categoria" in path and "modelos" in path:
            return _FakeBinaryFile(path)
        return real_open(path, mode, *args, **kwargs)

    monkeypatch.setattr(builtins, "open", fake_open)

    import pickle

    def fake_pickle_load(file_obj):
        filename = os.path.basename(getattr(file_obj, "name", ""))
        value = CATEGORY_OUTPUTS.get(filename, 0)
        return FakeModel(value)

    monkeypatch.setattr(pickle, "load", fake_pickle_load)

    module_path = Path(__file__).resolve().parents[1] / "PWAT.py"
    spec = importlib.util.spec_from_file_location("_pwat_under_test", module_path)
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, "_pwat_under_test", module)
    spec.loader.exec_module(module)

    masks_dir = tmp_path / "masks"
    masks_dir.mkdir()
    monkeypatch.setattr(module, "predictions_dir", str(masks_dir))
    module.__recorded__ = recorded
    return module


def test_predecir_mascara_returns_mask_path_and_saves_mask(pwat, monkeypatch):
    calls = {}

    def fake_load(path, target_size=(256, 256)):
        calls["loaded_path"] = path
        return "image-ready"

    def fake_predict_mask(model, image):
        calls["predict_args"] = (model, image)
        return "mask-raw"

    def fake_postprocess_mask(mask, threshold=0.5):
        calls["postprocess_args"] = (mask, threshold)
        return "mask-final"

    saved = {}

    def fake_save(mask, path):
        saved["mask"] = mask
        saved["path"] = path

    monkeypatch.setattr(pwat, "load_and_preprocess_image", fake_load)
    monkeypatch.setattr(pwat, "predict_mask", fake_predict_mask)
    monkeypatch.setattr(pwat, "postprocess_mask", fake_postprocess_mask)
    monkeypatch.setattr(pwat, "save_mask", fake_save)

    result = pwat.predecir_mascara("foo/bar/test_image.png", modelo="segmentation-model")
    expected_path = os.path.join(pwat.predictions_dir, "test_image.jpg")

    assert result == expected_path
    assert saved["mask"] == "mask-final"
    assert saved["path"] == expected_path
    assert calls["loaded_path"] == "foo/bar/test_image.png"
    assert calls["predict_args"][1] == "image-ready"
    assert calls["postprocess_args"] == ("mask-raw", 0.5)


def test_predecir_outputs_expected_categories(pwat, capsys):
    pwat.predecir("sample_image.jpg", "sample_mask.jpg")

    captured = capsys.readouterr().out.strip()
    expected = {
        "Cat3": CATEGORY_OUTPUTS["Categoria3.pkl"],
        "Cat4": CATEGORY_OUTPUTS["Categoria4.joblib"],
        "Cat5": CATEGORY_OUTPUTS["Categoria5.joblib"],
        "Cat6": CATEGORY_OUTPUTS["Categoria6.pkl"],
        "Cat7": CATEGORY_OUTPUTS["Categoria7.joblib"],
        "Cat8": CATEGORY_OUTPUTS["Categoria8.joblib"],
    }
    assert json.loads(captured) == expected

    recorded = pwat.__recorded__
    assert recorded["imread_calls"][:2] == ["sample_image.jpg", "sample_mask.jpg"]
    assert len(recorded["nrrd_writes"]) == 2
    assert recorded["nrrd_writes"][0].endswith(".nrrd")
    assert recorded["nrrd_writes"][1].endswith(".nrrd")
    assert recorded["extract_calls"][-1] == ("sample_image.nrrd", "sample_mask.nrrd")


def test_predecir_mascara_raises_when_image_not_loaded(pwat, monkeypatch):
    monkeypatch.setattr(pwat, "load_and_preprocess_image", lambda *args, **kwargs: None)
    with pytest.raises(ValueError) as exc:
        pwat.predecir_mascara("missing_image.png")
    assert "No se pudo cargar la imagen" in str(exc.value)


def test_predecir_propagates_imread_errors(pwat, monkeypatch):
    def failing_imread(path, flag):
        raise FileNotFoundError("file missing")

    monkeypatch.setattr(pwat.cv2, "imread", failing_imread)

    with pytest.raises(FileNotFoundError):
        pwat.predecir("missing.jpg", "mask.jpg")
