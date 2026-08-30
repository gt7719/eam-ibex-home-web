import {NextResponse} from 'next/server';
import {readPackageState} from '../../lib/packages';
export async function GET(){
  try{const {state}=await readPackageState();return NextResponse.json({config:state.published,revision:state.revision,publishedAt:state.publishedAt},{headers:{'Cache-Control':'no-store'}});}
  catch{return NextResponse.json({error:'Багцын тохиргоог уншиж чадсангүй.'},{status:503});}
}
