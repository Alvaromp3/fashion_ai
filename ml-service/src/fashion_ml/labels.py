"""Class names and garment-type mapping (Fashion-MNIST style taxonomy)."""

CLASS_NAMES = [
    "Ankle_boot",
    "Bag",
    "Coat",
    "Dress",
    "Pullover",
    "Sandal",
    "Shirt",
    "Sneaker",
    "T-shirt",
    "Trouser",
]

CLASS_TO_TIPO = {
    "Ankle_boot": "zapatos",
    "Bag": "accesorio",
    "Coat": "abrigo",
    "Dress": "vestido",
    "Pullover": "superior",
    "Sandal": "zapatos",
    "Shirt": "superior",
    "Sneaker": "zapatos",
    "T-shirt": "superior",
    "Trouser": "inferior",
}

TIPO_POR_INDICE = {
    0: "zapatos",
    1: "accesorio",
    2: "abrigo",
    3: "vestido",
    4: "superior",
    5: "zapatos",
    6: "superior",
    7: "zapatos",
    8: "superior",
    9: "inferior",
}
