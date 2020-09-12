

figma.showUI(__html__);
figma.ui.resize(220,180);
tell_ui_color()

figma.on('selectionchange', () => {
  tell_ui_color() 
})


figma.ui.onmessage = msg => {

  if (msg.type === 'create-rectangles') {
    var nodes: SceneNode[] = [];

    var x0 = 0;
    var y0 = 0;
    var base_color = msg.color;

    var base_color_rgb = hexToRgb(base_color); 
    var hsv;

    
    if (check_selected_corlor()) {
      x0 = figma.currentPage.selection[0].x+50;
      y0 = figma.currentPage.selection[0].y+50;

      for(let i=0;i<figma.currentPage.selection.length;i++){
        if (figma.currentPage.selection[i].fills[0].color) { 

          base_color_rgb = figma.currentPage.selection[i].fills[0].color
          hsv = rgbToHsv(base_color_rgb.r,base_color_rgb.g,base_color_rgb.b);
          nodes.push(renderScale(hsv,msg.count,x0,y0,figma.currentPage.selection[i].name,figma.currentPage.selection[i].parent))
          y0 += 60;
        }
      }
    } else if(base_color_rgb) {
      nodes.push(renderScale(rgbToHsv(base_color_rgb.r,base_color_rgb.g,base_color_rgb.b),msg.count,x0,y0))
    }
    figma.viewport.scrollAndZoomIntoView(nodes)
  }
};
function tell_ui_color() {
  if (check_selected_corlor()) {
      const fill = figma.currentPage.selection[0].fills[0].color

      figma.ui.postMessage({
        type: 'selectionChange',
        fill: rgbToHex(fill.r, fill.g, fill.b)
      })
    }
}

function check_selected_corlor(){
  return (figma.currentPage.selection && figma.currentPage.selection.length > 0 && figma.currentPage.selection[0].fills && figma.currentPage.selection[0].fills.length && figma.currentPage.selection[0].fills[0].color)
}

function renderScale(color_hsv, num_colors, x0=0, y0=0, name="", scale_parent = undefined){
  var nodes: SceneNode[] = [];
  
  var steps_v = Math.round(num_colors*1.1/(1.1+color_hsv.s))
  var steps_s = num_colors-steps_v
  
  var params = {
    v_step: 0.8/steps_v,
    slope_s: Math.max(color_hsv.s/(color_hsv.v+1),0.2),
    v_break_limit: Math.max(0.99,color_hsv.v),
  }

  
  params.b_s = color_hsv.s+color_hsv.v*params.slope_s
  params.i_break = Math.round((-color_hsv.v+params.v_break_limit)/params.v_step)
  params.v_break = color_hsv.v+params.i_break*params.v_step
  params.s_break = params.b_s - params.v_break*params.slope_s
  params.s_step =  (steps_s>0)?(params.s_break*0.9)/steps_s:0


  params.slope_v = 1/params.slope_s
  params.b_v = params.s_break+params.v_break*params.slope_v

  var break_color = {h:color_hsv.h, s:params.s_break, v:params.v_break}


  var v,s
  var steps_count = num_colors;

  for (let i=-1*steps_v+1; i<=steps_s;i++){
    var axis = (i>0)
    var color = calc_color(params,i,break_color,axis)
    addRectangle(nodes,x0,y0,color,name+"/"+steps_count.toString()+"0")
    steps_count--;
    x0+=60
  }

  if (scale_parent==undefined) scale_parent = nodes[0].parent
  var group = figma.group(nodes,scale_parent)
  group.name = name+" color scale"
  return group;
}

function addRectangle(nodes, x0=0, y0=0, color, name="") {
  var rect = figma.createRectangle();
  rect.x = x0;
  rect.y = y0;
  rect.resize(50,50)

  rect.fills = [{type: 'SOLID', color: {r:color.r, g:color.g, b:color.b}}];
  rect.name = name;
  figma.currentPage.appendChild(rect);
  nodes.push(rect);
}

function calc_color(params,i,hsv,axis=0) {
  var s,v
  if (axis == 0) {
    v = hsv.v + i*params.v_step
    s = params.b_s - v*params.slope_s

  } else {
    s = params.s_break-params.s_step*i
    v = (params.b_v - s)/params.slope_v
  }
  s = normalize(s)
  v = normalize(v)

  return HSVtoRGB(hsv.h, s, v)
}




function normalize(x){
  if (x<0) x = 0
  if (x>=1) x = 0.999
  return x;
}


////////// Converting colors

function mix(a, b, v)
{
    return (1-v)*a + v*b;
}

function HSVtoRGB(H, S, V)
{
    H = H*360
    var V2 = V * (1 - S);
    var r  = ((H>=0 && H<=60) || (H>=300 && H<=360)) ? V : ((H>=120 && H<=240) ? V2 : ((H>=60 && H<=120) ? mix(V,V2,(H-60)/60) : ((H>=240 && H<=300) ? mix(V2,V,(H-240)/60) : 0)));
    var g  = (H>=60 && H<=180) ? V : ((H>=240 && H<=360) ? V2 : ((H>=0 && H<=60) ? mix(V2,V,H/60) : ((H>=180 && H<=240) ? mix(V,V2,(H-180)/60) : 0)));
    var b  = (H>=0 && H<=120) ? V2 : ((H>=180 && H<=300) ? V : ((H>=120 && H<=180) ? mix(V2,V,(H-120)/60) : ((H>=300 && H<=360) ? mix(V,V2,(H-300)/60) : 0)));

    return {
        r : r,
        g : g,
        b : b
    };
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result ? {
    r: parseInt(result[1], 16)/255,
    g: parseInt(result[2], 16)/255,
    b: parseInt(result[3], 16)/255
  } : null;

}


function rgbToHsv(r, g, b) {

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, v = max;

  var d = max - min;
  s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return { h: h, s: s, v: v };
}

function componentToHex(c) {
  var hex = Math.round(c*255).toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return componentToHex(r) + componentToHex(g) + componentToHex(b);
}
