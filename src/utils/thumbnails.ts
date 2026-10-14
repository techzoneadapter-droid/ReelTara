import type {Movie} from '../types/movie';
import {validTrailer,youtubeKey} from './legal';
import {reviewedArtwork} from './artwork';
export const PLACEHOLDER_THUMBNAIL='/brand/thumbnail-placeholder.svg';
const hosts=new Set(['image.tmdb.org','i.ytimg.com','thumb.wikimedia.org','upload.wikimedia.org','static.tvmaze.com']);
export function safeThumbnail(value?:string):string|undefined {
 if(!value)return;
 if(/^\/(?:images|brand)\/[\w./-]+(?:\?[^\s]*)?$/.test(value)&&!value.includes('..'))return value;
 try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts.has(u.hostname))return u.href;}catch{}
}
export function thumbnailCandidates(movie?:Movie,preferred?:string,trailer=false):string[]{
 if(movie&&(movie.origin==='open_data'||movie.artwork)&&!reviewedArtwork(movie.artwork)) {
  // Saved/cached records must pass the same image-rights boundary as fresh API data.
  preferred='';movie={...movie,poster:'',backdrop:''};
 }
 const key=movie?.trailer?.provider==='youtube'&&validTrailer(movie.trailer)?movie.trailer.videoId:movie?.origin==='curated'?youtubeKey(movie.trailerUrl):undefined;
 const youtube=key&&/^[\w-]{11}$/.test(key)?`https://i.ytimg.com/vi/${key}/hqdefault.jpg`:undefined;
 // Open metadata adapters withhold unreviewed artwork; never fabricate provider poster URLs.
 return [...new Set([...(trailer?[youtube]:[]),preferred,movie?.poster,movie?.backdrop,youtube].map(safeThumbnail).filter((s):s is string=>!!s)),PLACEHOLDER_THUMBNAIL].filter((s,i,a)=>a.indexOf(s)===i);
}
const broken=new Map<string,number>();
export function rememberBrokenThumbnail(url:string){if(url===PLACEHOLDER_THUMBNAIL)return;broken.set(url,Date.now()+120000);if(broken.size>200)broken.delete(broken.keys().next().value!);}
export function firstThumbnailIndex(candidates:string[]){const index=candidates.findIndex(url=>(broken.get(url)||0)<=Date.now());return Math.max(0,index);}
