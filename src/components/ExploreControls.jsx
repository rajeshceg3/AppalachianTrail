import React,{useRef,useLayoutEffect,useEffect,useMemo} from 'react';
import {useThree,useFrame} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {getTerrainHeight,getPathX} from '../utils/terrain';
export default function ExploreControls({region,reset,walk}){
 const ref=useRef(),{camera,gl,invalidate}=useThree();
 const pose=useMemo(()=>{const z=8-walk,x=getPathX(z),y=getTerrainHeight(x,z,region.terrainParams);return {position:[x+1,y+(['mid-atlantic','feywood'].includes(region.id)?10:4),z+10],target:[x,getTerrainHeight(x,z-22,region.terrainParams)+1,z-22]}},[region.id,walk]);
 useLayoutEffect(()=>{const c=ref.current;if(!c)return;c.enabled=false;c.reset();camera.position.set(...pose.position);c.target.set(...pose.target);camera.lookAt(c.target);c.update();c.saveState();c.enabled=true;invalidate()},[pose,reset,camera,invalidate]);
 useEffect(()=>{const key=e=>{const c=ref.current;if(!c)return;if(e.key==='Home'){camera.position.set(...pose.position);c.target.set(...pose.target)}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target));s.theta+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;s.phi=Math.max(.1,Math.min(1.5,s.phi+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0)));camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(c.target))}else return;e.preventDefault();c.update();invalidate()};const el=gl.domElement;el.addEventListener('keydown',key);return()=>el.removeEventListener('keydown',key)},[camera,gl,invalidate,pose]);
 useFrame(()=>{if(ref.current)gl.domElement.dataset.camera=JSON.stringify({position:camera.position.toArray(),target:ref.current.target.toArray()})});
 return <OrbitControls ref={ref} enableDamping={false} enablePan={false} minDistance={4} maxDistance={90} minPolarAngle={.1} maxPolarAngle={1.5} onChange={invalidate}/>
}
