"""Unit tests: upload validation helpers."""

from fashion_ml.image_ops import allowed_file


def test_allowed_file_accepts_jpg():
    assert allowed_file("photo.JPG") is True


def test_allowed_file_rejects_exe():
    assert allowed_file("x.exe") is False


def test_allowed_file_rejects_no_extension():
    assert allowed_file("noext") is False
