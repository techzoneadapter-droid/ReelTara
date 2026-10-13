import { FreeCatalogService, catalogDiagnostics } from './freeCatalog';
import { movies as seeds } from '../data/movies';
import type { Catalog, Country, Movie, MovieDetails, SearchResult, CatalogPage } from '../types/movie';
import { OpenCatalogAdapter } from '../adapters/openCatalog';
import { UserStateService } from './userState';
import { preferredTrailer, youtubeKey } from './legal';
export interface CatalogAdapter { home(country:Country):Promise<Catalog>; search(query:string,country:Country):Promise<SearchResult>; details(movie:Movie,country:Country):Promise<MovieDetails> }
const unique = (items:Movie[]) => [...new Map(items.map(m=>[m.id,m])).values()];
export const fallbackCatalog:Catalog = {movies:seeds,trending:seeds.filter(m=>!m.free),popular:seeds.filter(m=>!m.free),nowPlaying:[],upcoming:[],free:seeds.filter(m=>m.free),genres:[],hotTrailers:seeds.filter(m=>!m.free&&m.trailerUrl),status:'fallback',message:'Curated catalog · Open metadata sources unavailable.'};
let available = seeds, freeAvailable = fallbackCatalog.free, freeExpires = 0;
let freeTask:Promise<void>|undefined;
const homeCache = new Map<Country,{value:Catalog;expires:number}>();
const homePending = new Map<Country,Promise<Catalog>>();
export const MovieService:CatalogAdapter & {retry():void;page(country:Country,page:number,sort:string,query?:string):Promise<Movie[]>;pageResult(country:Country,page:number,sort:string,query?:string):Promise<CatalogPage>;hotTrailers(country:Country):Promise<Movie[]>} = {
  async pageResult(country,page,sort,query) {
    const result = await OpenCatalogAdapter.listPage(country,page,query,sort);
    available = unique([...result.movies,...available]).slice(0,1500);
    return result;
  },
  async page(country,page,sort,query) {return (await this.pageResult(country,page,sort,query)).movies;},
  async hotTrailers() {return fallbackCatalog.hotTrailers || [];},
  retry(){homeCache.clear();},
  async home(country) {
    const hit=homeCache.get(country);if(hit&&hit.expires>Date.now()) return hit.value;
    const pending=homePending.get(country);if(pending) return pending;
    const task=(async()=>{
      const results=await Promise.allSettled([OpenCatalogAdapter.listPage(country),OpenCatalogAdapter.listPage(country,1,'','now_playing'),OpenCatalogAdapter.listPage(country,1,'','upcoming')]);
      const index=results[0].status==='fulfilled'?results[0].value.movies:[];
      const recent=results[1].status==='fulfilled'?results[1].value.movies:[];
      const live=index.length>0||recent.length>0;
      if(!freeTask&&freeExpires<=Date.now()) freeTask=FreeCatalogService.load().then(items=>{freeAvailable=items;homeCache.clear();if(typeof window!=='undefined') window.dispatchEvent(new Event('free-catalog-updated'));}).catch(()=>{}).finally(()=>{freeTask=undefined;freeExpires=Date.now()+300000;});
      const ranked=[...index].sort((a,b)=>Number(b.id.startsWith('wikidata:'))-Number(a.id.startsWith('wikidata:'))||b.year-a.year||b.rating-a.rating);
      const result:Catalog={genres:[],trending:live?ranked:hit?.value.trending||fallbackCatalog.trending,popular:live?ranked:hit?.value.popular||fallbackCatalog.popular,nowPlaying:recent,upcoming:results[2].status==='fulfilled'?results[2].value.movies:[],free:freeAvailable,hotTrailers:fallbackCatalog.hotTrailers,movies:unique([...index,...recent,...freeAvailable,...(!live?seeds.filter(m=>!m.free):[])]),status:live && (typeof navigator==='undefined'||navigator.onLine)?'live':'fallback',message:typeof navigator!=='undefined'&&!navigator.onLine&&live?'Offline. Showing cached open metadata; refresh when online.':!live?fallbackCatalog.message:results.some(r=>r.status==='rejected')?'Some open metadata sources are temporarily unavailable.':undefined};
      available=unique([...result.movies,...available]).slice(0,1500);
      Object.assign(catalogDiagnostics,{lastDiscoveryRefresh:live?new Date().toISOString():catalogDiagnostics.lastDiscoveryRefresh,discoveryItemCount:result.movies.filter(m=>!m.free).length});
      homeCache.set(country,{value:result,expires:Date.now()+(live?300000:30000)});return result;
    })();homePending.set(country,task);try{return await task;}finally{homePending.delete(country);}
  },
  async search(query,country) {
    const normalized=query.trim().toLowerCase(),user=UserStateService.snapshot();
    const local=unique([...available,...user.watchlist.map(e=>e.movie),...user.viewed.map(e=>e.movie)]).filter(m=>m.title.toLowerCase().includes(normalized));
    if(!normalized) return {movies:available,status:'fallback'};
    try{const result=await this.pageResult(country,1,'featured',query);return {movies:unique([...result.movies,...local.filter(m=>m.free)]),status:'live',hasMore:result.hasMore,totalPages:result.totalPages};}
    catch{return {movies:local,status:'fallback',message:'Open search unavailable. Showing matching saved titles.'};}
  },
  async details(movie) {
    if(movie.origin==='open_data') return OpenCatalogAdapter.details(movie);
    const resolved=seeds.find(s=>s.id===movie.id&&s.freeSource)||movie;
    const curated=seeds.find(s=>s.id===movie.id),key=youtubeKey(curated?.trailerUrl);
    const trailer=preferredTrailer([...(movie.trailer?[movie.trailer]:[]),...(key?[{id:key,provider:'youtube' as const,videoId:key,sourceName:'YouTube',sourcePageUrl:curated!.trailerUrl,type:'Trailer' as const,official:true,name:'Official Trailer'}]:[])]);
    return {...resolved,genres:[],credits:{cast:movie.cast.map((name,id)=>({id,name})),crew:movie.director?[{id:0,name:movie.director,job:'Director'}]:[]},trailer,trailerUrl:trailer?.sourcePageUrl,trailers:trailer?[trailer]:[],providers:[],providerStatus:'unavailable'};
  }
};
export const CatalogService=MovieService;
export const SearchAdapter={search:(query:string,country:Country)=>MovieService.search(query,country)};
