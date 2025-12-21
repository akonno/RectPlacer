// src/docs/App.vue
<template>
	<div>
		<section class="hero">
			<div class="hero-body">
				<div class="container">
				<h1 class="title">
				RectPlacer Documentation
				</h1>
				</div>
			</div>
		</section>
		<section class="section">
			<div class="container">
		<div class="content">

<p>
	RectPlacer is a lightweight web tool for defining and managing axis-aligned cuboid regions on STL models, primarily intended for numerical analysis preprocessing and research workflows.
</p>

<div class="buttons">
	<a class="button is-link" href="https://akonno.github.io/RectPlacer/" target="_blank" rel="noopener noreferrer"><strong>Live Demo</strong></a>
	<a class="button is-ghost" href="https://github.com/akonno/rectplacer" target="_blank" rel="noopener noreferrer">GitHub</a>
</div>

<h2 class="subtitle">Intended use cases</h2>

<ul>
<li>Numerical analysis preprocessing (CFD, DEM, particle tracking)</li>
<li>Definition of regions of interest (ROI) on complex STL geometries</li>
<li>Research and engineering workflows where CAD tools are excessive</li>
<li>Parametric, text-based management of spatial regions</li>
</ul>


<h2 class="subtitle">Research usage</h2>

<p>
RectPlacer has been used in a conference proceeding to define and manage structural regions (axis-aligned cuboids) on complex STL models, for example for icing accumulation analysis on ship superstructures.
</p>

<ul>
<li>
  Paper:
  <a href="https://doi.org/10.14856/conf.39.0_165" target="_blank" rel="noopener noreferrer">
    Suizu, Konno and Ozeki,
    Development of a method to calculate ice accretion on ship superstructures,
    Conference Proceedings of the Japan Society of Naval Architects and Ocean Engineers,
    Vol. 39, 2024A-OS3-7 (2024)
  </a>
  (in Japanese)
</li>
</ul>

<figure class="image">
<img src="../assets/img/rp-sample1a.png" alt="RectPlacer interface showing STL model and axis-aligned cuboid regions" />
</figure>
<p class="is-size-7 has-text-grey">
Example: defining multiple axis-aligned cuboid regions on an STL model.
</p>

<figure class="image">
<img src="../assets/img/rp-sample1b.png" alt="Adhering water mass distribution evaluated using RectPlacer-defined regions" />
</figure>
<p class="is-size-7 has-text-grey">
Example from published research: distribution of adhering water mass on ship superstructures
under a 45° wind direction and 6 m/s wind speed, evaluated using cuboid regions defined with RectPlacer.
</p>

<h2 class="subtitle">Quick start</h2>
<ol>
  <li>Open the <a href="https://akonno.github.io/RectPlacer/" target="_blank" rel="noopener noreferrer"><strong>Live Demo</strong></a>.</li>
  <li>Load an STL model.</li>
  <li>Define cuboids in the text area and export CSV.</li>
</ol>

<h2 class="subtitle">Detailed usage</h2>

<h3>Prerequisites</h3>

<p>A modern web browser that supports WebGL and JavaScript ES6.</p>

<h3>Usage</h3>

<p>Access <a href="https://akonno.github.io/RectPlacer/" target="_blank" rel="noopener noreferrer">https://akonno.github.io/RectPlacer/</a> to use this app.</p>

<h3>Adding and Modifying Cuboids</h3>

<ul>
	<li>To add a new cuboid, input its dimensions and positions in the designated text area in the format: <code>lx,ly,lz,X,Y,Z</code>.
	(<code>lx</code>, <code>ly</code>, <code>lz</code> are lengths along X, Y, Z axes respectively; Z is up)</li>
	<li>To modify an existing cuboid, change the values in the text area and the display will update automatically.</li>
	<li>To highlight an existing cuboid, put <code>*</code> at the start of the line.</li>
	<li>
	To temporarily emphasize a cuboid while editing, place the text cursor on the
	corresponding line. The cuboid on that line will be emphasized automatically.
	</li>
</ul>

<p class="is-size-7 has-text-grey">
This temporary highlight is cleared when the text area loses focus.
</p>

<h3>Loading a 3D Object</h3>

<p>Use the file input control to load an STL file. The 3D object will appear in the virtual space once the file is loaded.</p>
<h3>STL Scale Adjustment</h3>

<p>
STL files do not store unit information. As a result, STL models created in
millimeters, meters, or inches may appear at different scales when loaded.
</p>

<p>
RectPlacer provides an STL scale setting that allows users to manually adjust
the size of the loaded STL model to match the intended physical scale.
</p>

<ul>
  <li>Open the <em>STL Settings</em> dialog.</li>
  <li>Set a positive scale factor.</li>
  <li>Apply the scale to the loaded STL model.</li>
</ul>

<p>
	Note: Scaling affects only the STL model (a display setting).
	Cuboid dimensions remain unchanged, and the scale factor is not stored in the CSV.
</p>

<h3>Saving Cuboid Data</h3>

<p>Press the "Save data as CSV" button to save the current state of all cuboids to a CSV file. This file can be used to reload the configuration later.</p>

<h2 class="subtitle">Features</h2>

<ul>
	<li><strong>Place Multiple Cuboids</strong>: Users can create and position multiple cuboids in the space. These cuboids align with the x, y, and z axes.</li>
	<li><strong>Load 3D Object from STL File</strong>: The application supports loading a 3D object from an STL file to be placed in the space.</li>
	<li><strong>Edit Cuboid Data</strong>: Users can input and edit the dimensions and positions of each cuboid directly through a text area in the UI.</li>
	<li><strong>Save Cuboid Data</strong>: The application allows saving the cuboid data (dimensions and positions) to a file for later use.</li>
	<li><strong>STL Scale Adjustment</strong>: Manually adjust the scale of loaded STL models.</li>
	<li><strong>Cursor-based Cuboid Emphasis</strong>: Temporarily emphasize a cuboid by placing the cursor on its definition line.</li>
</ul>

<h2 class="subtitle">License</h2>

<p>This software is released under the MIT License.
	See the
<a href="https://github.com/akonno/rectplacer/blob/main/LICENSE"
   target="_blank"
   rel="noopener noreferrer">LICENSE file</a>
for details.
</p>

<div class="box">
  <h2 class="subtitle">Optional support</h2>

  <p>
    RectPlacer is provided freely as an open research and engineering tool.
  </p>

  <p>
    If you find it useful in your research or engineering work and would like to support
    the continued development and maintenance of open tools like this, optional support
    is welcome:
    <a class="button is-small is-ghost"
       href="https://ko-fi.com/akonno"
       target="_blank"
       rel="noopener noreferrer">Ko-fi</a>.
  </p>

  <p class="is-size-7">
    Support is entirely optional and does not affect access to the tool,
    available features, or its use in any research or engineering context.
  </p>
  </div>
		</div>
		</div>
		</section>
	</div>
	<section class="section">
		<p>Source: <a href="https://github.com/akonno/rectplacer" target="_blank" rel="noopener noreferrer">RectPlacer</a> on <a href="https://github.com/" target="_blank">GitHub</a></p>
		<p>Textures for the floor by <a href="https://ambientcg.com/" target="_blank" rel="noopener noreferrer">Lennart Demes at ambientCG</a></p>
	</section>
	<footer class="footer">
		<div class="content has-text-centered">
			<p>
			<a href="https://github.com/akonno/rectplacer" target="_blank" rel="noopener noreferrer"><strong>RectPlacer</strong></a> by KONNO Akihisa
			</p>
		</div>
	</footer>
</template>
