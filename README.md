# RectPlacer - 3D Model and Cuboid Placement Tool

RectPlacer is a lightweight web tool for defining and managing axis-aligned cuboid regions on STL models, primarily intended for numerical analysis preprocessing and research workflows.

- **Live Demo**: https://akonno.github.io/RectPlacer/
- **Documentation**: https://akonno.github.io/RectPlacer/docs/

## Intended use cases

- Numerical analysis preprocessing (CFD, DEM, particle tracking)
- Definition of regions of interest (ROI) on complex STL geometries
- Research and engineering workflows where CAD tools are excessive
- Parametric, text-based management of spatial regions

![RectPlacer screenshot](src/assets/img/rp-sample1a.png)

*Example of defining multiple axis-aligned cuboid regions on an STL model.*

## Research usage

RectPlacer has been used in published research to define and manage structural regions on complex STL models, for example in icing accumulation analysis on ship superstructures
([Suizu, Konno and Ozeki, JASNAOE Proc., 2024](https://doi.org/10.14856/conf.39.0_165)).


## Core functionality

- **Place Multiple Cuboids**: Users can create and position multiple cuboids in the space. These cuboids align with the x, y, and z axes.
- **Load 3D Object from STL File**: The application supports loading a 3D object from an STL file to be placed in the space.
- **Edit Cuboid Data**: Users can input and edit the dimensions and positions of each cuboid directly through a text area in the UI.
- **Save Cuboid Data**: The application allows saving the cuboid data (dimensions and positions) to a file for later use.

## Getting Started

Try the live demo in your browser:
https://akonno.github.io/RectPlacer/

Detailed usage instructions are available in the documentation:
https://akonno.github.io/RectPlacer/docs/

## License

This software is released under the [MIT License](./LICENSE).
