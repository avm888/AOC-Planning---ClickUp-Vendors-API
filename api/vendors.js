// API que sincroniza vendors desde ClickUp
// Deploy en Vercel: https://vercel.com/new

const CLICKUP_TOKEN = 'pk_4986606_29BTZL2HZA69PTDT4NS5M3GFQG6O5KUZ';

const COUPLE_CONFIG = {
  'kris-tom': { vendorListId: '901711945301', couple: 'Kris & Tom' },
  'bianca-seann': { vendorListId: '901712059160', couple: 'Bianca & Seann' },
  'olga-don': { vendorListId: '901712065156', couple: 'Olga & Don' },
  'camille-marcus': { vendorListId: '901712169091', couple: 'Camille & Marcus' },
  'erin-joey': { vendorListId: '901712184199', couple: 'Erin & Joey' },
  'grace-leo': { vendorListId: '901712293318', couple: 'Grace & Leo' },
  'lindsay-robert': { vendorListId: '901712298494', couple: 'Lindsay & Robert' }
};

let cachedVendors = {};
let lastUpdate = 0;
const CACHE_DURATION = 30000; // 30 segundos

async function fetchVendorsFromClickUp(coupleId) {
  try {
    const config = COUPLE_CONFIG[coupleId];
    if (!config) return [];

    const response = await fetch(
      `https://api.clickup.com/api/v2/list/${config.vendorListId}/task?limit=100`,
      {
        method: 'GET',
        headers: {
          'Authorization': CLICKUP_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Error fetching vendors for ${coupleId}:`, response.statusText);
      return [];
    }

    const data = await response.json();
    
    // Filtrar vendors activos (excluir "client denied")
    return (data.tasks || [])
      .filter(task => !['client denied'].includes(task.status?.toLowerCase()))
      .map(task => ({
        name: task.name,
        status: task.status?.toLowerCase() || 'pending',
        id: task.id
      }));
  } catch (error) {
    console.error(`Error fetching vendors for ${coupleId}:`, error.message);
    return [];
  }
}

async function updateCache() {
  const now = Date.now();
  
  // Si el caché es reciente, no actualizar
  if (cachedVendors && Object.keys(cachedVendors).length > 0 && (now - lastUpdate) < CACHE_DURATION) {
    return cachedVendors;
  }

  console.log('🔄 Actualizando vendors desde ClickUp...');
  
  const allVendors = {};
  
  for (const coupleId of Object.keys(COUPLE_CONFIG)) {
    allVendors[coupleId] = await fetchVendorsFromClickUp(coupleId);
  }

  cachedVendors = allVendors;
  lastUpdate = now;
  
  console.log('✓ Caché actualizado');
  return allVendors;
}

module.exports = async (req, res) => {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const vendors = await updateCache();
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      vendors: vendors
    });
  } catch (error) {
    console.error('Error en API vendors:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
