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
  space = false;  // space按键
  mouseEnterEle = false;  // 鼠标是否在可移动图形上
  nowStatus = "";  // 当前状态
  references = {};  // 所有的参考点
  drawReferences = null; // 当前绘制图形的参考点
  data_id = 1;  // 图形id
  adhesion = false;  // 参考线吸合

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
        // 绘制新图形时的平移
        case  this.space &&
              !!this.draw &&
              /^(rect)|(circle)|(ellipse)$/.test(this.draw.node().tagName) &&
              this.nowStatus === "draw":
          this.translation();
          break;
        // 平移
        case  this.ctrl &&
              !!this.draw &&
              /^(rect)|(circle)|(ellipse)$/.test(this.draw.node().tagName) &&
              this.nowStatus === "translation":
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
      this.space = keyCode === 32;

      if(keyCode === 17 && this.mouseEnterEle){
        this.svg.classed("move", true);
      }
    });
    this.document.on("keyup", () => {
      switch(d3.event.keyCode){
        case 17:
          this.ctrl = false;
          delete this.translationStart;
          this.svg.classed("move", false);
          break;
        case 32:
          this.space = false;
          delete this.translationStart;
          break;
      }
    });
    window.addEventListener("blur", () => {
      this.ctrl = false;
      this.space = false;
      this.svg.classed("move", false);
      this.draw = null;
      this.mouseEnterEle = false;
      this.nowStatus = "";
      delete this.translationStart;
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
      this.nowStatus = "";
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
          .attr("height", 0)
          .attr("data_id", this.data_id++);
        this.drawEvent();
        break;
      case "circle":
        this.draw = this.svg.append("circle")
          .attr("cx", offsetX)
          .attr("cy", offsetY)
          .attr("r", 0)
          .attr("data_id", this.data_id++);
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
    let {startX, startY, width, height, position} = this.getEndpoint4(),
      {offsetX, offsetY} = d3.event,
      width1 = type === "square" ? Math.min(width, height) : width,
      height1 = type === "square" ? Math.min(width, height) : height,
      type = this.drawObj.type,
      adhesion;

    switch(type){
      case "rect":
      case "square":
        // 初始的参考点
        this.drawReferences = [
          "V" + startX,
          "V" + this.arithmetic("+", startX, width1/2),
          "V" + (startX + width1),
          "H" + startY,
          "H" + this.arithmetic("+", startY, height1/2),
          "H" + (startY + height1)
        ];
        // 吸合
        let adhesion = this.autoAdhesion(startX, startY, width, height, position);
        // 吸合后的参考点
        this.drawReferences = [
          "V" + adhesion.startX,
          "V" + this.arithmetic("+", adhesion.startX, adhesion.width1/2),
          "V" + (adhesion.startX + adhesion.width1),
          "H" + adhesion.startY,
          "H" + this.arithmetic("+", adhesion.startY, adhesion.height1/2),
          "H" + (adhesion.startY + adhesion.height1)
        ];
        // 显示参考点
        this.showReferences();
        // 修改图形
        this.draw.attr("x", adhesion.startX)
          .attr("y", adhesion.startY)
          .attr("width", adhesion.width1)
          .attr("height", adhesion.height1);
        break;
      case "circle":
        let r = Math.min(width, height)/2;
        this.drawReferences = [
          "V" + startX,
          "V" + this.arithmetic("+", startX, r),
          "V" + this.arithmetic("+", startX, 2*r),
          "H" + startY,
          "H" + this.arithmetic("+", startY, r),
          "H" + this.arithmetic("+", startY, 2*r)
        ];
        this.showReferences();
        if(!this.adhesion){
          this.draw.attr("cx", startX + r)
            .attr("cy", startY + r)
            .attr("r", r);
        }
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
      height = Math.abs(this.spotStart.offsetY - d3.event.offsetY),
      data_id = this.draw.attr("data_id").toString();
    if(Math.max(width, height) <= 5){
      this.draw.remove();
      this.deleteReferences(data_id);
      this.draw = null;
      return;
    }

    // 添加到参考点
    if(this.references[data_id]){
      this.draw = null;
      return;
    }
    this.references[data_id] = this.references[data_id] || [];
    switch(this.draw.node().tagName){
      case "rect":
        // 垂直方向（左）
        this.references[data_id].push(`V${
          Math.round(this.draw.attr("x"))
          }`);
        // 垂直方向（中）
        this.references[data_id].push(`V${
          this.arithmetic("+", this.draw.attr("x"), 
          this.arithmetic("/", this.draw.attr("width"), 2))
          }`);
        // 垂直方向（右）
        this.references[data_id].push(`V${
          this.arithmetic("+", this.draw.attr("x"), this.draw.attr("width"))
          }`);
        // 水平方向（左）
        this.references[data_id].push(`H${
          Math.round(this.draw.attr("y"))
          }`);
        // 水平方向（中）
        this.references[data_id].push(`H${
          this.arithmetic("+", this.draw.attr("y"), 
          this.arithmetic("/", this.draw.attr("height"), 2))
          }`);
        // 水平方向（右）
        this.references[data_id].push(`H${
          this.arithmetic("+", this.draw.attr("y"), this.draw.attr("height"))
          }`);
        break;
      case "circle":
        // 垂直方向（左）
        this.references[data_id].push(`V${
          this.arithmetic("-", this.draw.attr("cx"), this.draw.attr("r"))
          }`);
        // 垂直方向（中）
        this.references[data_id].push(`V${
          Math.round(this.draw.attr("cx"))
          }`);
        // 垂直方向（右）
        this.references[data_id].push(`V${
          this.arithmetic("+", this.draw.attr("cx"), this.draw.attr("r"))
          }`);
        // 水平方向（左）
        this.references[data_id].push(`H${
          this.arithmetic("-", this.draw.attr("cy"), this.draw.attr("r"))
          }`);
        // 水平方向（中）
        this.references[data_id].push(`H${
          Math.round(this.draw.attr("cy"))
          }`);
        // 水平方向（右）
        this.references[data_id].push(`H${
          this.arithmetic("+", this.draw.attr("cy"), this.draw.attr("r"))
          }`);
        break;
    }

    this.draw = null;
  }

  // 自动吸合
  autoAdhesion(startX=parseFloat(this.drawReferences[0].match(/\d+/)[0]),
               startY=parseFloat(this.drawReferences[3].match(/\d+/)[0]),
               width=this.arithmetic("-", this.drawReferences[2].match(/\d+/)[0], this.drawReferences[0].match(/\d+/)[0]),
               height=this.arithmetic("-", this.drawReferences[5].match(/\d+/)[0], this.drawReferences[3].match(/\d+/)[0]),
               position){
    let type = this.drawObj.type,
      _this = this,
      match;

    for(let k in this.references){
      if(!this.references[k]) break;
      this.references[k].forEach((item1, index1) => {
        match = "";
        this.drawReferences.forEach((item2, index2) => {
          let num = parseFloat(parseFloat(item1.match(/\d+/)[0] - item2.match(/\d+/)[0]));
          if(item1.match(/[HV]/)[0] === item2.match(/[HV]/)[0] && Math.abs(num) <= config.adhesion){
            match += index2;
            adhesion(item1, index1, item2, index2, num);
          }
        });
      });
    }

    function adhesion(obj1, index1, obj2, index2, num){
      // console.log("arguments: ", arguments);
      // console.log("position: ", position)
      switch(index1){
        // X轴左、右
        case 0:
        case 1:
        case 2:
          if(position === 1 || position === 2){
            width = _this.arithmetic("-", obj1.match(/\d+/)[0] - startX);
          } else {
            startX = parseFloat(obj1.match(/\d+/)[0]);
            width = _this.arithmetic("-", _this.drawReferences[2].match(/\d+/)[0], startX);
          }
          break;
        /*// X轴中
        case 1:*/

          // break;
        // Y轴左、右
        case 3:
        case 4:
        case 5:
          if(position === 2 || position === 3){
            height = _this.arithmetic("-", obj1.match(/\d+/)[0] - startY);
          } else {
            startY = parseFloat(obj1.match(/\d+/)[0]);
            height = _this.arithmetic("-", _this.drawReferences[5].match(/\d+/)[0], startY);
          }
          break;
        // Y轴中
        /*case 4:

          break;*/
      }
    }

    return {
      startX,
      startY,
      width,
      height,
      width1: type === "square" ? Math.min(width, height) : width,
      height1: type === "square" ? Math.min(width, height) : height,
    };
  }

  // 修改指定的参考线（平移）
  putReference1(x, y){
    if(!this.drawReferences) return;

    for(let i = 0; i < this.drawReferences.length; i++){
      if(!this.drawReferences[i]) break;

      let type = this.drawReferences[i].match(/^[HV]/)[0];
      this.drawReferences[i] = type + this.arithmetic("+", this.drawReferences[i].replace(/^[HV]/, ""), type === "V" ? x : y);
    }

    // this.showReferences();
  }

  // 显示指定的参考线
  showReferences(){
    d3.selectAll(".reference").remove();

    for(let k in this.references){
      if(!this.references[k]) break;
      this.references[k].forEach(item => {
        this.drawReferences.forEach(item2 => {
          let num = parseFloat(parseFloat(item.match(/\d+/)[0] - item2.match(/\d+/)[0]));
          if(item.match(/[HV]/)[0] === item2.match(/[HV]/)[0] && Math.abs(num) <= config.adhesion){
            this.dottedLine(item, k);
          }
        });
      });
    }
  }

  // 删除参考线
  deleteReferences(data_id, ...references){
    if(!data_id) return;

    data_id = data_id.toString();
    let reference = d3.selectAll(".reference").filter(function(){
      return d3.select(this).attr("data_id") === data_id;
    });

    // 全部删除
    if(!references || references.length === 0){
      delete this.references[data_id];
      reference.remove();
    }

    // 删除指定的
    references.forEach(item => {
      let dom = reference.filter(function(){
        return d3.select(this).attr("reference_value") === item;
      });
      if(dom) dom.remove();
    });
  }

  // 获取矩形的4个端点坐标
  getEndpoint4(){
    let {offsetX, offsetY} = d3.event,
      width = offsetX - this.spotStart.offsetX,
      height = offsetY - this.spotStart.offsetY,
      startX, startY, position;

    switch(true){
      // 右下
      case width >= 0 && height >= 0:
        startX = this.spotStart.offsetX;
        startY = this.spotStart.offsetY;
        position = 2;
        break;
      // 右上
      case width >= 0 && height <= 0:
        startX = this.spotStart.offsetX;
        startY = offsetY;
        height = Math.abs(height);
        position = 1;
        break;
      // 左下
      case width <= 0 && height >= 0:
        startX = offsetX;
        startY = this.spotStart.offsetY;
        width = Math.abs(width);
        position = 3;
        break;
      // 左上
      case width <= 0 && height <= 0:
        startX = offsetX;
        startY = offsetY;
        width = Math.abs(width);
        height = Math.abs(height);
        position = 4;
        break;
    }

    return {
      startX,
      startY,
      width,
      height,
      position
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
      left = this.arithmetic("-", offsetX, this.translationStart.offsetX),
      top = this.arithmetic("-", offsetY, this.translationStart.offsetY);
    this.putReference1(left, top);
    let adhesion = this.autoAdhesion();
    switch(this.draw.node().tagName){
      case "rect":
        this.draw
          .attr("x", adhesion.startX)
          .attr("y", adhesion.startY)
          .attr("width", adhesion.width)
          .attr("height", adhesion.height);
        break;
      case "circle":
        this.draw
          .attr("cx", this.arithmetic("+", adhesion.startX, adhesion.width/2))
          .attr("cy", this.arithmetic("+", adhesion.startY, adhesion.height/2))
          .attr("r", Math.round(adhesion.width/2));
        break;
    }

    this.showReferences();

    this.translationStart = {
      offsetX,
      offsetY
    };
    if(this.nowStatus === "draw"){
      this.spotStart.offsetX += left;
      this.spotStart.offsetY += top;
    }
  }

  // 绘制虚线
  dottedLine(reference, data_id){
    if(!reference) return;

    let type = reference.match(/^[HV]/)[0],
      num = reference.match(/\d+$/)[0];
    if(!type || !num) return;

    let space = 5,
      svg = this.svg.node(),
      max = type === "H" ? svg.scrollWidth : svg.scrollHeight;

    this.svg.insert("path", ":first-child")
      .classed("reference", true)
      .attr("reference_value", reference)
      .attr("data_id", data_id)
      .style("stroke", data_id ? "#56ccff" : "black")
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
