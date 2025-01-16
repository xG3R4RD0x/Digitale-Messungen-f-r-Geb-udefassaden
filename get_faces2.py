import pyvista as pv
import os

# crear carpeta views para guardar las imagenes
output_dir = "views"
os.makedirs(output_dir, exist_ok=True)


# Ruta del archivo .obj
path_to_obj = (
    "./building/Bambo_House.obj"  # Reemplaza con la ruta real de tu archivo .obj
)
mesh = pv.read(path_to_obj)  # Cargar el modelo 3D

# Centro del modelo y distancia de la cámara
center = mesh.center
distance = mesh.length * 2
print(center)
print(distance)
# Definir las vistas estándar
views = [
    {
        "position": [center[0] - distance, center[1], center[2]],
        "viewup": [0, 1, 0],
        "filename": "right_view.png",
    },  # Lateral izquierda
    {
        "position": [center[0] + distance, center[1], center[2]],
        "viewup": [0, 1, 0],
        "filename": "left_view.png",
    },  # Lateral derecha
    {
        "position": [center[0], center[1], center[2] + distance],
        "viewup": [0, 1, 0],
        "filename": "back_view.png",
    },  # Trasera
    {
        "position": [center[0], center[1], center[2] - distance],
        "viewup": [0, 1, 0],
        "filename": "front_view.png",
    },  # frontal
    {
        "position": [center[0], center[1] + distance, center[2]],
        "viewup": [0, 0, 1],
        "filename": "top_view.png",
    },  # Top
]

# Generar imágenes para cada vista
for view in views:
    # Crear un nuevo renderizador para cada vista
    plotter = pv.Plotter(off_screen=True)
    plotter.add_mesh(mesh, color="lightgrey")

    # Configurar la posición de la cámara
    position = view["position"]  # Asegurar la posición correcta
    viewup = view["viewup"]  # Vector de vista hacia arriba
    plotter.camera_position = [position, center, viewup]  # Configurar la cámara

    # Guardar la imagen
    print(f"Generando vista: {view['filename']} con posición de cámara: {position}")
    output_path = os.path.join(output_dir, view["filename"])
    plotter.screenshot(output_path)  # Capturar y guardar la imagen

    # Cerrar el renderizador
    plotter.close()

print("Imágenes de vistas estándar guardadas exitosamente.")
