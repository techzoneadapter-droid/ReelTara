import type { Country, Movie, MovieDetails, CatalogPage } from '../types/movie';
import { object, request, AppError } from '../services/http';
import {reviewedArtwork} from '../utils/artwork';
export const OpenCatalogAdapter = {
  async listPage(country:Country,page=1,query='',sort='featured'):Promise<CatalogPage> {
    const url = '/api/open-catalog?artwork=2&country='+country+'&page='+page+(sort.startsWith('country_')?'&source=wikidata':sort==='series'?'&source=tvmaze':'')+(query?'&query='+encodeURIComponent(query):'')+(sort==='now_playing'?'&feed=recent':sort==='upcoming'?'&source=wikidata&feed=upcoming':'');
    const response = await request(url, object, 900000);
    if(!Array.isArray(response.items)) throw new AppError('invalid_response','Open catalog unavailable');
    const movies = (response.items as Movie[]).filter(m=>typeof m.id==='string' && /^(tvmaze:\d+|wikidata:Q\d+)$/.test(m.id) && typeof m.title==='string').map(m=>{const artwork=reviewedArtwork(m.artwork);return {...m,year:Number(m.year)||0,rating:Number(m.rating)||0,genre:typeof m.genre==='string'?m.genre:'Film',duration:typeof m.duration==='string'?m.duration:'Film',certificate:m.certificate||'',overview:m.overview||'',director:m.director||'',cast:Array.isArray(m.cast)?m.cast.filter(v=>typeof v==='string'):[],provider:m.provider||'',providerUrl:m.providerUrl||'',artwork,free:false,verifiedLegal:false,playable:false,poster:artwork?.posterUrl||'',backdrop:artwork?.backdropUrl||'',freeSource:undefined,playbackCandidates:undefined,contentMode:'discovery' as const,origin:'open_data' as const};});
    return {movies,page,totalPages:Number(response.totalPages)||page,totalResults:movies.length,hasMore:response.hasMore===true};
  },
  async list(country:Country,page=1,query=''):Promise<Movie[]> { return (await this.listPage(country,page,query)).movies; },
  async details(movie:Movie):Promise<MovieDetails> {
    let episodes:MovieDetails["episodes"];
    if(movie.id.startsWith("tvmaze:")) {try {const data=await request("/api/open-catalog?id="+encodeURIComponent(movie.id),object,3600000);if(data.item && typeof data.item === "object")movie={...movie,cast:(data.item as Movie).cast || []};if(Array.isArray(data.episodes)) episodes=data.episodes as MovieDetails["episodes"];}catch{/* The already available metadata remains usable. */}}
    return {...movie, episodes, genres:[], credits:{cast:movie.cast.map((name,id)=>({name,id})),crew:movie.director?[{id:0,name:movie.director,job:'Director'}]:[]}, trailers:movie.trailer?[movie.trailer]:[], providers:[],providerStatus:'unavailable'};
  }
};
