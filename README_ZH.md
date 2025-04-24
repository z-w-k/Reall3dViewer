<p align=center>
<img style="width:128px;height:128px" src="https://gotoeasy.github.io/reall3d/logo.svg"/>
</p>

# Reall3dViewer

`Reall3dViewer`是一个基于`Three.js`的`3D Gaussian Splatting`渲染器。打造卓越的`3DGS`渲染器并非易事，我们选择开源，希望能集思广益，群策群力，共同为推动`3DGS`应用发展助一臂之力！

<br>

<p align="center">
    <a href="https://github.com/reall3d-com/Reall3dViewer/blob/master/README_EN.md"><img src="https://img.shields.io/badge/Readme-Engilsh-brightgreen.svg"></a>
    <a href="https://github.com/microsoft/TypeScript"><img src="https://img.shields.io/badge/Lang-typescript-brightgreen.svg"></a>
    <a href="https://github.com/mrdoob/three.js"><img src="https://img.shields.io/badge/Base-threejs-brightgreen.svg"></a>
    <a href="https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/"><img src="https://img.shields.io/badge/Model-3DGS-brightgreen.svg"></a>
    <a href="https://github.com/reall3d-com/Reall3dViewer/blob/master/LICENSE"><img src="https://img.shields.io/github/license/reall3d-com/Reall3dViewer"></a>
<p>

<br>

## 特点
- [x] 支持`.splat`以及优化的`.spx`格式
- [x] 支持标注测量
- [x] 支持文字水印


## 在线演示
https://reall3d.com/reall3dviewer/index.html


## `.spx`
https://github.com/reall3d-com/Reall3dViewer/blob/main/SPX_ZH.md


## 用法
```shell
# develop
npm run dev

# build
npm run build

# open a web browser to render your 3dgs model
# http://hostname:port/index.html?url=your-model-link-address

# .spx file can be obtained through conversion using the gsbox
# https://github.com/gotoeasy/gsbox
gsbox p2x -i /path/to/input.ply -o /path/to/output.spx -sh 0
```

## TODO
- 持续优化增强渲染性能
- 设计更加优化的模型格式`.spx`及工具
- 大场景


## 履历
https://github.com/reall3d-com/Reall3dViewer/releases


## 鸣谢
感谢以下项目提供的参考实现
- https://github.com/antimatter15/splat
- https://github.com/mkkellogg/GaussianSplats3D
- https://github.com/huggingface/gsplat.js
- https://github.com/playcanvas/supersplat


## 联系
欢迎在项目页面上提交`issue`，商业版提供模型格式优化工具，支持嵌入水印保护模型产权，请随时与我们联系。
- Site: https://reall3d.com
- Email: ai@geohold.com 
