#!/usr/bin/env bash

# Ir SIEMPRE a la carpeta del proyecto (donde está el script)
cd "$(dirname "$0")"

# Abrir VS Code en el proyecto
code .

# (opcional) usar nvm si lo usas
# nvm use

# Lanzar el servidor
npm run dev

# Mantener la terminal abierta
exec bash
