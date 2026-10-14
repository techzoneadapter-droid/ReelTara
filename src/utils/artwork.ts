import type {Artwork,Movie} from '../types/movie';
export function reviewedArtwork(value:unknown):Artwork|undefined {
 if(!value||typeof value!=='object')return;const a=value as Artwork;
 if(a.licenseVerified!==true||!a.attribution||!a.checkedAt||!/^https:\/\/creativecommons\.org\/(?:licenses\/(?:by|by-sa)\/[1-4]\.0(?:\/[a-z]{2})?|publicdomain\/zero\/1\.0)\/?$/i.test(a.licenseUrl))return;
 const age=Date.now()-Date.parse(a.checkedAt);if(!Number.isFinite(age)||age < -300000||age>86400000)return;
 try{
  const source=new URL(a.sourcePageUrl);if(source.protocol!=='https:'||source.hostname!=='commons.wikimedia.org'||!source.pathname.startsWith('/wiki/File:')||source.username||source.password)return;
  for(const value of [a.posterUrl,a.backdropUrl]){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!['upload.wikimedia.org','thumb.wikimedia.org'].includes(u.hostname)||!u.pathname.startsWith('/wikipedia/commons/'))return;}
  return a;
 }catch{return;}
}
export function artworkCounts(movies:Movie[]) {
 const unique=[...new Map(movies.map(m=>[m.id,m])).values()];
 const licensed=unique.filter(m=>reviewedArtwork(m.artwork)).length;
 const local=unique.filter(m=>!reviewedArtwork(m.artwork)&&m.poster.startsWith('/images/')).length;
 return {total:unique.length,licensed,local,placeholder:unique.length-licensed-local};
}
