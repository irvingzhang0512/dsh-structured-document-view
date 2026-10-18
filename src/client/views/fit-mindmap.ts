export interface FitTarget { scaleVal: number; scaleFit(): void; scale(value:number):void; toCenter():void }
/** 隐藏／零尺寸时延迟首次布局，避免上游scaleFit产生0或NaN并冻结到下一次挂载。 */
export function fitVisibleMindmap(mind:FitTarget,size:{width:number;height:number}):boolean {
  if(!Number.isFinite(size.width)||!Number.isFinite(size.height)||size.width<=0||size.height<=0)return false
  mind.scaleFit()
  const value=Number.isFinite(mind.scaleVal)?Math.min(3,Math.max(0.3,mind.scaleVal)):1
  if(value!==mind.scaleVal)mind.scale(value)
  mind.toCenter()
  return true
}
