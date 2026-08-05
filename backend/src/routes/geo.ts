import { FastifyInstance } from 'fastify';

export default async function geoRoutes(app: FastifyInstance) {
  app.get('/api/geo/country', {
    schema: {
      tags: ['Geo'],
      description: 'Detect visitor country from Cloudflare cf-ipcountry header',
    },
  }, async (request) => {
    const headers = request.headers;
    const cfCountry = headers['cf-ipcountry'] as string | undefined;
    const acceptLang = headers['accept-language'] as string | undefined;

    return {
      country: cfCountry || acceptLang?.split(',')[0]?.split('-')[1] || 'IN',
      source: cfCountry ? 'cloudflare' : 'accept-language',
    };
  });
}
