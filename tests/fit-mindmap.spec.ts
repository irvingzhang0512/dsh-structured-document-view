import {it,expect}from'vitest'
import{fitVisibleMindmap}from'../src/client/views/fit-mindmap.ts'
it('隐藏后再显示：零尺寸不调用上游fit，显示后可重新布局',()=>{
 let calls=0,centered=0
 const mind={scaleVal:1,scaleFit(){calls++;this.scaleVal=.8},scale(value:number){this.scaleVal=value},toCenter(){centered++}}
 expect(fitVisibleMindmap(mind,{width:1000,height:0})).toBe(false);expect(calls).toBe(0);expect(mind.scaleVal).toBe(1)
 expect(fitVisibleMindmap(mind,{width:1000,height:160})).toBe(true);expect(calls).toBe(1);expect(centered).toBe(1);expect(mind.scaleVal).toBe(.8)
})
it.each([[0,.3],[.1,.3],[.8,.8],[9,3],[NaN,1]])('上游缩放%s保持有效范围%s',(upstream,expected)=>{
 const mind={scaleVal:1,scaleFit(){this.scaleVal=upstream},scale(value:number){this.scaleVal=value},toCenter(){}}
 expect(fitVisibleMindmap(mind,{width:400,height:160})).toBe(true);expect(mind.scaleVal).toBe(expected)
})
