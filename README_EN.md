<p align=center>
<img style="width:128px;height:128px" src="https://gotoeasy.github.io/reall3d/logo.svg"/>
</p>

# Reall3dViewer

`Reall3dViewer` is a 3D Gaussian Splatting renderer built on Three.js. Crafting an exceptional renderer is no small feat, which is why we've chosen to open-source our project. We hope to harness the collective wisdom and efforts of the community to drive the advancement of 3DGS applications together!

<br>

<p align="center">
    <a href="https://github.com/reall3d-com/Reall3dViewer/blob/master/README_ZH.md"><img src="https://img.shields.io/badge/Readme-Chinese-brightgreen.svg"></a>
    <a href="https://github.com/microsoft/TypeScript"><img src="https://img.shields.io/badge/Lang-typescript-brightgreen.svg"></a>
    <a href="https://github.com/mrdoob/three.js"><img src="https://img.shields.io/badge/Base-threejs-brightgreen.svg"></a>
    <a href="https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/"><img src="https://img.shields.io/badge/Model-3DGS-brightgreen.svg"></a>
    <a href="https://github.com/reall3d-com/Reall3dViewer/releases/latest"><img src="https://img.shields.io/github/release/reall3d-com/Reall3dViewer.svg"></a>
    <a href="https://github.com/reall3d-com/Reall3dViewer/blob/master/LICENSE"><img src="https://img.shields.io/github/license/reall3d-com/Reall3dViewer"></a>
<p>

<br>

## Features
- [x] Mobile friendly
- [x] Support `.splat`,`.sp20` and optimized `.bin` formats
- [x] Support mark and measurement
- [x] Support text watermark
- [x] Support large scene rendering


## Live demo
https://reall3d.com/reall3dviewer/index.html

<br>

<p align="center">
    <a href="https://reall3d.com/reall3dviewer/index.html?url=/demo-models/demo-lod-kcc.scene.json">
        <img src="https://gotoeasy.github.io/reall3d/kcc-lod.png"/>
        <br>
        Click to Open
    </a>
    <br>
    High-performance rendering of large scenes based on dynamic Level of Detail (LOD)<br>
    Large scene of 100 million points can also provide a smooth visual experience on consumer grade devices
<p>


<br>


## Basic Usage
```shell
# develop
npm run dev

# build
npm run build

# open a web browser to render your 3dgs model
# http://hostname:port/index.html?url=your-model-link-address

# The .sp20 format is similar to .splat, but it reduces the file size by 37.5%
# .sp20 file can be obtained through conversion using the gsbox
# https://github.com/gotoeasy/gsbox
gsbox ply2splat20 -i /path/to/input.ply -o /path/to/output.sp20
```

## TODO
- Continuously optimize and enhance rendering performance
- Design more optimized model format and tool

## Release History
https://github.com/reall3d-com/Reall3dViewer/releases


## Acknowledgments
We would like to express our gratitude to the following projects for their valuable reference implementations
- https://github.com/antimatter15/splat
- https://github.com/mkkellogg/GaussianSplats3D
- https://github.com/huggingface/gsplat.js
- https://github.com/playcanvas/supersplat


## Contact
Feel free to submit an issue on the project page. Our commercial version offers a 3DGS model format optimization tool and supports embedding watermarks to protect model ownership. Please don't hesitate to contact us.
- Site: https://reall3d.com
- Email: ai@geohold.com 
