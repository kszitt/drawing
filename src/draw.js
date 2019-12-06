import * as d3 from "d3-selection"
import config from "./config"
/*import {message} from "antd"
message.config({
  duration: 2,
});*/
import "./draw.scss"
import "./iconfont/iconfont.css"

let tools = [
  {
    name: "rect",
    text: "矩形",
    icon: "&#xe619;",
    className: "rect"
  },{
    name: "square",
    text: "正方形",
    icon: "&#xe68f;",
    className: "square"
  },{
    name: "circle",
    text: "圆",
    icon: "&#xe684;",
    className: "circle"
  },{
    name: "pencil",
    text: "铅笔",
    icon: "&#xe600;",
    className: "pencil"
  }
];


class Draw {
  constructor(id){
    if(!d3){
      throw new Error("请引入d3.js，CDN请参考“https://cdnjs.com/libraries/d3”");
    }
    this.box = d3.select(id)
      .classed("draw", true);
    if(!this.box.node()){
      throw new Error(`请实例化“draw”时，传入${id ? "正确的" : ""}容器“selector”`);
    }
  }

  drawObj = {
    className: ""
  };
  draw = null;  // 当前所画图形
  spotStart = null;  // 绘制图形初始点
  ctrl = false;   // ctrl按键
  mouseEnterEle = false;  // 鼠标是否在可移动图形上
  nowStatus = "";  // 当前状态
  references = [];  // 所有的参考点

  // 初始化
  init(){

    // 生成工具栏
    this.tool = this.box.append("ul")
      .classed("tool", true);
    tools.forEach((item, index) => {
      if(index === 0) this.drawObj.type = item.name;
      this.tool.append("li")
        .classed("icon iconfont", true)
        .classed("active", index === 0)
        .html(item.icon)
        .attr("title", item.text)
        .on("click", (obj, index, dom) => {
          // 当前元素
          d3.select(dom[0]).classed("active", true);
          this.drawObj.type = obj.name;

          // 其它元素不选中
          this.tool.selectAll("li").each(function (dom, i) {
            if (tools[i].name === obj.name) return;

            d3.select(this).classed("active", false);
          });
        })
        .data([item]);
    });

    // 生成svg
    this.svg = this.box.append("svg");

    this.svgEvent();
  }

  // svg事件
  svgEvent(){
    this.document = d3.select(document);

    this.svg.on("mousedown", () => {
      if(this.ctrl) return;

      this.drawStart();
    });
    this.svg.on("mousemove", () => {
      switch(true){
        // 平移
        case this.ctrl && !!this.draw && this.nowStatus === "translation":
          this.translation();
          break;
        // 绘制新图形
        case !!this.draw && this.nowStatus === "draw":
          this.drawing();
          break;
      }
    });
    this.document.on("keydown", () => {
      let keyCode = d3.event.keyCode;
      this.ctrl = keyCode === 17;

      if(keyCode === 17 && this.mouseEnterEle){
        this.svg.classed("move", true);
      }
    });
    this.document.on("keyup", () => {
      if(d3.event.keyCode === 17){
        this.ctrl = false;
        this.svg.classed("move", false);
      }
    });
    window.addEventListener("blur", () => {
      this.ctrl = false;
      this.svg.classed("move", false);
      this.draw = null;
      this.mouseEnterEle = false;
    }, false);
    this.document.on("mouseup", () => {
      if(!this.draw) return;

      this.drawEnd();
    });
  }

  // 绘制图形的事件
  drawEvent(){
    if(!this.draw) return;

    this.draw.on("mousedown", () => {
      let target = d3.event.target;
      if(!target || !this.ctrl) return;

      this.draw = d3.select(target);
      this.svg.classed("move", true);
      this.nowStatus = "translation";
    }).on("mouseup", () => {
      delete this.translationStart;
    }).on("mouseenter", () => {
      this.mouseEnterEle = true;
      this.svg.classed("move", this.ctrl);
    }).on("mousemove", () => {
      this.svg.classed("move", this.ctrl);
    }).on("mouseleave", () => {
      this.mouseEnterEle = false;
      this.svg.classed("move", false);
    });
  }

  // 开始绘制
  drawStart(){
    let {offsetX, offsetY} = d3.event;
    this.spotStart = {
      offsetX,
      offsetY
    };

    this.nowStatus = "draw";
    switch(this.drawObj.type){
      case "rect":
      case "square":
        this.draw = this.svg.append("rect")
          .attr("x", offsetX)
          .attr("y", offsetY)
          .attr("width", 0)
          .attr("height", 0);
        this.drawEvent();
        break;
      case "circle":
        this.draw = this.svg.append("circle")
          .attr("cx", offsetX)
          .attr("cy", offsetY)
          .attr("r", 0);
        this.drawEvent();
        break;
      case "pencil":
        this.draw = this.svg.append("path")
          .attr("d", `M${offsetX} ${offsetY}`);
        break;
    }
  }

  // 绘制中
  drawing(){
    let {startX, startY, width, height} = this.getEndpoint4(),
      {offsetX, offsetY} = d3.event,
      type = this.drawObj.type;

    switch(type){
      case "rect":
      case "square":
        this.draw.attr("x", startX)
          .attr("y", startY)
          .attr("width", type === "square" ? Math.min(width, height) : width)
          .attr("height", type === "square" ? Math.min(width, height) : height);
        break;
      case "circle":
        let r = Math.min(width, height)/2;
        this.draw.attr("cx", startX + r)
          .attr("cy", startY + r)
          .attr("r", r);
        break;
      case "pencil":
        this.draw.attr("d", `${this.draw.attr("d")} L${offsetX} ${offsetY}`);
        break;
    }
  }

  // 绘制结束
  drawEnd(){
    // 太小的删除
    let width = Math.abs(this.spotStart.offsetX - d3.event.offsetX),
      height = Math.abs(this.spotStart.offsetY - d3.event.offsetY);
    if(Math.max(width, height) <= 5){
      this.draw.remove();
      this.draw = null;
      return;
    }

    // 添加到参考点
    switch(this.draw.node().tagName){
      case "rect":
        // 垂直方向（左）
        this.references.push(`V${
          Math.round(this.draw.attr("x"))
          }`);
        // 垂直方向（中）
        this.references.push(`V${
          this.arithmetic("+", this.draw.attr("x"), 
          this.arithmetic("/", this.draw.attr("width"), 2))
          }`);
        // 垂直方向（右）
        this.references.push(`V${
          this.arithmetic("+", this.draw.attr("x"), this.draw.attr("width"))
          }`);
        // 水平方向（左）
        this.references.push(`H${
          Math.round(this.draw.attr("y"))
          }`);
        // 水平方向（中）
        this.references.push(`H${
          this.arithmetic("+", this.draw.attr("y"), 
          this.arithmetic("/", this.draw.attr("height"), 2))
          }`);
        // 水平方向（右）
        this.references.push(`H${
          this.arithmetic("+", this.draw.attr("y"), this.draw.attr("height"))
          }`);
        break;
      case "circle":
        // 垂直方向（左）
        this.references.push(`V${
          this.arithmetic("-", this.draw.attr("cx"), this.draw.attr("r"))
          }`);
        // 垂直方向（中）
        this.references.push(`V${
          Math.round(this.draw.attr("cx"))
          }`);
        // 垂直方向（右）
        this.references.push(`V${
          this.arithmetic("+", this.draw.attr("cx"), this.draw.attr("r"))
          }`);
        // 水平方向（左）
        this.references.push(`H${
          this.arithmetic("-", this.draw.attr("cy"), this.draw.attr("r"))
          }`);
        // 水平方向（中）
        this.references.push(`H${
          Math.round(this.draw.attr("cy"))
          }`);
        // 水平方向（右）
        this.references.push(`H${
          this.arithmetic("+", this.draw.attr("cy"), this.draw.attr("r"))
          }`);
        break;
    }

    this.draw = null;

    this.references.forEach(item => {
      console.log(item);
      this.dottedLine(item);
    });
  }

  // 获取矩形的4个端点坐标
  getEndpoint4(){
    let {offsetX, offsetY} = d3.event,
      width = offsetX - this.spotStart.offsetX,
      height = offsetY - this.spotStart.offsetY,
      startX, startY;

    switch(true){
      // 右下
      case width >= 0 && height >= 0:
        startX = this.spotStart.offsetX;
        startY = this.spotStart.offsetY;
        break;
      // 右上
      case width >= 0 && height <= 0:
        startX = this.spotStart.offsetX;
        startY = offsetY;
        height = Math.abs(height);
        break;
      // 左下
      case width <= 0 && height >= 0:
        startX = offsetX;
        startY = this.spotStart.offsetY;
        width = Math.abs(width);
        break;
      // 左上
      case width <= 0 && height <= 0:
        startX = offsetX;
        startY = offsetY;
        width = Math.abs(width);
        height = Math.abs(height);
        break;
    }

    return {
      startX,
      startY,
      width,
      height
    }
  }

  // 平移
  translation(){
    if(!this.draw) return;

    if(!this.translationStart){
      this.translationStart = {  // 平移初始点
        offsetX: d3.event.offsetX,
        offsetY: d3.event.offsetY
      };
    }

    let {offsetX, offsetY} = d3.event,
      left = offsetX - this.translationStart.offsetX,
      top = offsetY - this.translationStart.offsetY;

    switch(this.draw.node().tagName){
      case "rect":
        this.draw
          .attr("x", parseFloat(this.draw.attr("x")) + left)
          .attr("y", parseFloat(this.draw.attr("y")) + top);
        break;
      case "circle":
        this.draw
          .attr("cx", parseFloat(this.draw.attr("cx")) + left)
          .attr("cy", parseFloat(this.draw.attr("cy")) + top);
        break;
    }

    this.translationStart = {
      offsetX,
      offsetY
    };
  }

  // 绘制虚线
  dottedLine(reference){
    if(!reference) return;

    let type = reference.match(/^[HV]/)[0],
      num = reference.match(/\d+$/)[0];
    if(!type || !num) return;

    let space = 5,
      svg = this.svg.node(),
      max = type === "H" ? svg.scrollWidth : svg.scrollHeight;

    this.svg.append("path")
      .attr("d", getPath());

    function getPath(d="", total=0){
      if(total/space%2 === 0){
        d += `M${type === "H" ? total : num} ${type === "H" ? num : total} `;
      } else {
        d += `${type}${total} `;
      }

      if(total > max+space) return d.replace(/(M[\d ]+)? $/, "");
      return getPath(d, total+space);
    }
  }

  // 运算
  arithmetic(type, ...nums){
    let strArr = nums.map(item => item.toString()),
      total, float;
    strArr = strArr.map(item => {
      let num = item.match(/(?<=\.)\d+/);
      return num ? num[0].length : 0;
    });
    strArr.sort();
    float = strArr.length > 0 ? strArr[strArr.length-1] : 0;

    nums = nums.map(item => item.toString());
    nums.forEach(item => {
      let num = parseFloat(item) * Math.pow(10, float);
      if(!total){
        total = num;
        return;
      }

      switch(type){
        case "+":
          total += num;
          break;
        case "-":
          total -= num;
          break;
        case "*":
          total *= num;
          break;
        case "/":
          total /= num;
          break;
      }
    });

    total /= Math.pow(10, float);
    return Math.round(total);
  }
}

export default Draw;
