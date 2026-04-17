"""Unit tests: taxonomy constants (FR-3 alignment)."""

from fashion_ml.labels import CLASS_NAMES, CLASS_TO_TIPO, TIPO_POR_INDICE


def test_class_names_length():
    assert len(CLASS_NAMES) == 10


def test_class_to_tipo_maps_t_shirt():
    assert CLASS_TO_TIPO["T-shirt"] == "superior"


def test_tipo_por_indice_covers_indices():
    assert all(i in TIPO_POR_INDICE for i in range(10))
