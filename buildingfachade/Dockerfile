FROM ubuntu:20.04

# Actualizar e instalar dependencias básicas
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    wget \
    cmake \
    libboost-all-dev \
    libgl1-mesa-dev \
    libglew-dev \
    libxrandr-dev \
    libxinerama-dev \
    libxcursor-dev \
    libxi-dev \
    libtbb-dev \
    libpython3-dev \
    python3 \
    python3-pip

# Instalar AliceVision (núcleo de Meshroom)
RUN git clone --recursive https://github.com/alicevision/AliceVision.git /AliceVision && \
    mkdir /AliceVision/build && \
    cd /AliceVision/build && \
    cmake .. -DCMAKE_INSTALL_PREFIX=/usr/local -DCUDA_ENABLED=OFF && \
    make -j$(nproc) && \
    make install

# Instalar Meshroom
RUN git clone https://github.com/alicevision/meshroom.git /meshroom && \
    pip3 install -r /meshroom/requirements.txt

# Establecer directorio de trabajo
WORKDIR /meshroom

# Comando por defecto
CMD ["python3", "meshroom/ui"]
