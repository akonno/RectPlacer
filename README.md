# RectPlacer - 3D Model and Cuboid Placement Tool

This web application allows users to interactively place multiple cuboids and a single 3D object in a virtual space. The application is built using Vue.js for its responsive user interface and Three.js for rendering 3D graphics. Users can load the shape of the 3D object from an STL file and manipulate the dimensions and positions of cuboids directly through a textual interface.

## Features

- **Place Multiple Cuboids**: Users can create and position multiple cuboids in the space. These cuboids align with the x, y, and z axes.
- **Load 3D Object from STL File**: The application supports loading a 3D object from an STL file to be placed in the space.
- **Edit Cuboid Data**: Users can input and edit the dimensions and positions of each cuboid directly through a text area in the UI.
- **Save Cuboid Data**: The application allows saving the cuboid data (dimensions and positions) to a file for later use.

## Getting Started

### Prerequisites

- A modern web browser that supports WebGL and JavaScript ES6.

## Usage

Access https://akonno.github.io/RectPlacer/ to use this app.

### Adding and Modifying Cuboids

- To add a new cuboid, input its dimensions and positions in the designated text area in the format: `Width,Height,Depth,X,Y,Z`.
- To modify an existing cuboid, change the values in the text area and the display will update automatically.
- To highlight an existing cuboid, put '*' at the start of the line.

### Loading a 3D Object

- Use the file input control to load an STL file. The 3D object will appear in the virtual space once the file is loaded.

### Saving Cuboid Data

- Press the "Save data as CSV" button to save the current state of all cuboids to a CSV file. This file can be used to reload the configuration later.

## License

This software is released under the MIT License.
