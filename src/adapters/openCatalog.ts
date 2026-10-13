import type { Country, Movie, MovieDetails } from '../types/movie';
import { object, request } from '../services/http';
import { AppError } from '../services/http';
const url = (country:Country,page:number,query='') => '/api/open-catalog?country='+country+'&page='+page+(query?'&query='+encodeURIComponent(query):'');
export const OpenCatalogAdapter = {
  async list(country:Country,page=1,query=''):Promise<Movie[]> {
    const response = await request(url(country,page,query), object, 3600000);
    if(!Array.isArray(response.items)) throw new AppError('invalid_response','Open catalog unavailable');
    return (response.items as Movie[]).filter(m=>typeof m.id==='string' && typeof m.title==='string').slice(0,120);
  },
  details(movie:Movie):MovieDetails {
    return {...movie, genres:[], credits:{cast:[],crew:[]}, trailers:movie.trailer?[movie.trailer]:[], providers:[],providerStatus:'unavailable'};
  }
};
