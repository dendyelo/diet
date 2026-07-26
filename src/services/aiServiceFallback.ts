import type { AIFoodResult } from './aiService';
import { FoodItemBreakdown } from '../types';

export class LocalFoodEstimateUnavailableError extends Error {
  constructor() {
    super('Deskripsi belum dikenali oleh basis estimasi lokal.');
    this.name = 'LocalFoodEstimateUnavailableError';
  }
}

function parseItemQuantity(text: string): number {
  const lower = text.toLowerCase().trim();

  if (lower.includes('setengah') || lower.includes('1/2')) return 0.5;
  if (lower.includes('dua') || lower.includes('sepasang') || lower.includes('2x') || lower.includes('2 ')) return 2;
  if (lower.includes('tiga') || lower.includes('3x') || lower.includes('3 ')) return 3;
  if (lower.includes('empat') || lower.includes('4x') || lower.includes('4 ')) return 4;
  if (lower.includes('lima') || lower.includes('5x') || lower.includes('5 ')) return 5;

  const numMatch = lower.match(/(\d+)\s*(butir|potong|biji|buah|pcs|porsi|telur|mangkok|centong)?/i);
  if (numMatch && numMatch[1]) {
    const parsed = parseInt(numMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
      return parsed;
    }
  }

  return 1;
}

export function smartIndonesianCulinaryEngine(foodText: string): AIFoodResult {
  const lower = foodText.toLowerCase();

  const items: FoodItemBreakdown[] = [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  const unknownParts: string[] = [];

  const rawParts = foodText.split(/,|\+|\spake\s|\sdan\s|\n/i).map((p) => p.trim()).filter(Boolean);

  if (rawParts.length > 0) {
    rawParts.forEach((part) => {
      const pLower = part.toLowerCase();
      const qty = parseItemQuantity(part);

      let unitCal = 0;
      let unitProtein = 0;
      let unitCarbs = 0;
      let unitFat = 0;
      let displayLabel = part;
      let recognized = false;

      let sugarAdd = 0;
      if (pLower.includes('less sugar')) {
        sugarAdd = -15;
      } else if (pLower.includes('no sugar') || pLower.includes('tawar') || pLower.includes('zero')) {
        sugarAdd = -30;
      }

      if (pLower.includes('pisang goreng')) {
        recognized = true;
        unitCal = 110;
        unitProtein = 2;
        unitCarbs = 22;
        unitFat = 6;
        displayLabel = `${qty > 1 ? qty + ' Potong ' : ''}Pisang Goreng`;
      } else if (pLower.includes('telur')) {
        recognized = true;
        const isFried = pLower.includes('goreng') || pLower.includes('dadar') || pLower.includes('ceplok');
        unitCal = isFried ? 110 : 78;
        unitProtein = 7;
        unitCarbs = 1;
        unitFat = isFried ? 8 : 5;
        displayLabel = `${qty} Butir Telur${pLower.includes('dadar') ? ' Dadar' : pLower.includes('ceplok') ? ' Ceplok' : ' Rebus'}`;
      } else if (pLower.includes('nasi uduk') || pLower.includes('nasi kuning')) {
        recognized = true;
        unitCal = 260;
        unitProtein = 5;
        unitCarbs = 46;
        unitFat = 7;
        displayLabel = `${qty > 1 ? qty + ' Centong ' : ''}Nasi Uduk/Kuning`;
      } else if (pLower.includes('nasi')) {
        recognized = true;
        const isHalf = pLower.includes('setengah') || pLower.includes('dikit');
        unitCal = isHalf ? 100 : 200;
        unitProtein = 4;
        unitCarbs = isHalf ? 22 : 44;
        unitFat = 1;
        displayLabel = `${qty > 1 ? qty + ' Centong ' : ''}Nasi Putih`;
      } else if (pLower.includes('ayam')) {
        recognized = true;
        const isBreast = pLower.includes('dada');
        const isCrispy = pLower.includes('geprek') || pLower.includes('crispy') || pLower.includes('kentucky');
        unitCal = isCrispy ? 320 : pLower.includes('bakar') ? (isBreast ? 200 : 230) : 260;
        unitProtein = isBreast ? 32 : 24;
        unitCarbs = isCrispy ? 15 : 2;
        unitFat = isCrispy ? 18 : pLower.includes('bakar') ? 8 : 14;
        displayLabel = `${qty > 1 ? qty + ' Potong ' : ''}Ayam ${pLower.includes('bakar') ? 'Bakar' : isCrispy ? 'Geprek/Crispy' : 'Goreng'}`;
      } else if (pLower.includes('tahu') || pLower.includes('tempe')) {
        recognized = true;
        const isBacem = pLower.includes('bacem');
        unitCal = isBacem ? 120 : 90;
        unitProtein = 6;
        unitCarbs = isBacem ? 14 : 8;
        unitFat = 5;
        displayLabel = `${qty > 1 ? qty + ' Potong ' : ''}${pLower.includes('tahu') ? 'Tahu' : 'Tempe'}${isBacem ? ' Bacem' : ''}`;
      } else if (pLower.includes('bakso')) {
        recognized = true;
        unitCal = 320;
        unitProtein = 18;
        unitCarbs = 24;
        unitFat = 12;
        displayLabel = '1 Porsi Bakso Bening';
      } else if (pLower.includes('soto') || pLower.includes('sop')) {
        recognized = true;
        const hasSantan = pLower.includes('betawi') || pLower.includes('santan');
        unitCal = hasSantan ? 450 : 310;
        unitProtein = 22;
        unitCarbs = 18;
        unitFat = hasSantan ? 26 : 10;
        displayLabel = `Porsi ${pLower.includes('soto') ? 'Soto' : 'Sop'}${hasSantan ? ' Santan' : ' Bening'}`;
      } else if (pLower.includes('boba') || pLower.includes('kopi manis') || pLower.includes('es teh manis')) {
        recognized = true;
        unitCal = Math.max(50, (pLower.includes('boba') ? 380 : 180) + sugarAdd);
        unitProtein = 2;
        unitCarbs = Math.max(10, 45 + Math.round(sugarAdd / 4));
        unitFat = pLower.includes('boba') ? 12 : 4;
        displayLabel = `Minuman ${part}`;
      } else if (pLower.includes('gado') || pLower.includes('pecel')) {
        recognized = true;
        unitCal = 310;
        unitProtein = 12;
        unitCarbs = 30;
        unitFat = 14;
        displayLabel = `1 Porsi ${pLower.includes('gado') ? 'Gado-Gado' : 'Pecel'}`;
      } else if (pLower.includes('rendang')) {
        recognized = true;
        unitCal = 250;
        unitProtein = 20;
        unitCarbs = 6;
        unitFat = 17;
        displayLabel = `${qty > 1 ? qty + ' Potong ' : ''}Rendang Daging`;
      } else if (pLower.includes('sambal')) {
        recognized = true;
        unitCal = 40;
        unitProtein = 1;
        unitCarbs = 3;
        unitFat = 3;
        displayLabel = 'Sambal';
      } else if (
        pLower.includes('lalap') ||
        pLower.includes('sayur') ||
        pLower.includes('timun') ||
        pLower.includes('selada')
      ) {
        recognized = true;
        unitCal = 35;
        unitProtein = 2;
        unitCarbs = 7;
        unitFat = 0;
        displayLabel = 'Sayur / Lalapan';
      } else if (pLower.includes('ikan')) {
        recognized = true;
        const isFried = pLower.includes('goreng');
        unitCal = isFried ? 240 : 180;
        unitProtein = 26;
        unitCarbs = 1;
        unitFat = isFried ? 14 : 8;
        displayLabel = `${qty > 1 ? `${qty} Potong ` : ''}Ikan ${
          isFried ? 'Goreng' : 'Bakar / Kukus'
        }`;
      } else if (pLower.includes('mie') || pLower.includes('mi ')) {
        recognized = true;
        const isFried = pLower.includes('goreng');
        unitCal = isFried ? 420 : 350;
        unitProtein = 10;
        unitCarbs = isFried ? 58 : 52;
        unitFat = isFried ? 17 : 12;
        displayLabel = `1 Porsi Mi ${isFried ? 'Goreng' : 'Rebus'}`;
      } else if (pLower.includes('roti')) {
        recognized = true;
        unitCal = 80;
        unitProtein = 3;
        unitCarbs = 15;
        unitFat = 1;
        displayLabel = `${qty > 1 ? `${qty} Lembar ` : ''}Roti`;
      }

      if (!recognized) {
        unknownParts.push(part);
        return;
      }

      const itemTotalCal = Math.round(unitCal * qty);
      items.push({ name: displayLabel, calories: itemTotalCal });

      totalCalories += itemTotalCal;
      totalProtein += Math.round(unitProtein * qty);
      totalCarbs += Math.round(unitCarbs * qty);
      totalFat += Math.round(unitFat * qty);
    });
  }

  if (items.length === 0 || unknownParts.length > 0) {
    throw new LocalFoodEstimateUnavailableError();
  }

  return {
    name: foodText.trim(),
    nutrition: {
      calories: totalCalories,
      proteinGrams: totalProtein,
      carbsGrams: totalCarbs,
      fatGrams: totalFat,
    },
    confidence: 'medium',
    aiNotes:
      'Estimasi lokal dari porsi standar; periksa kembali jika ukuran atau cara masak berbeda.',
    isOnlineAI: false,
    itemsBreakdown: items,
  };
}
