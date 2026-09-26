import type{Role,Session,Tokens}from'../../types/api';
const KEY='recruitment.session';let memory:Session|null=null;const listeners=new Set<()=>void>();
function decode(token:string):{role?:Role;email?:string}{try{const payload=token.split('.')[1];if(!payload)return{};return JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/'))) as {role?:Role;email?:string}}catch{return{}}}
export function createSession(tokens:Tokens):Session{const claims=decode(tokens.accessToken);if(!claims.role||!claims.email)throw new Error('Token identity is missing');return{...tokens,role:claims.role,email:claims.email,expiresAt:Date.now()+tokens.expiresIn*1000}}
export function getSession(){if(memory)return memory;try{const raw=sessionStorage.getItem(KEY);memory=raw?JSON.parse(raw)as Session:null}catch{memory=null}return memory}
export function setSession(value:Session|null){memory=value;if(value)sessionStorage.setItem(KEY,JSON.stringify(value));else sessionStorage.removeItem(KEY);listeners.forEach(fn=>fn())}
export function subscribeSession(fn:()=>void){listeners.add(fn);return()=>listeners.delete(fn)}
export function clearSession(){setSession(null)}
