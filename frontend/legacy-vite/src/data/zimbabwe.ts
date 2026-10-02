export const districtsByProvince: Record<string, string[]> = {
  'Bulawayo Metropolitan': ['Bulawayo'],
  'Harare Metropolitan': ['Harare', 'Chitungwiza'],
  Manicaland: ['Buhera', 'Chimanimani', 'Chipinge', 'Makoni', 'Mutare', 'Mutasa', 'Nyanga'],
  'Mashonaland Central': ['Bindura', 'Guruve', 'Mazowe', 'Mount Darwin', 'Muzarabani', 'Rushinga', 'Shamva'],
  'Mashonaland East': ['Chikomba', 'Goromonzi', 'Marondera', 'Mudzi', 'Murehwa', 'Mutoko', 'Seke', 'Uzumba-Maramba-Pfungwe', 'Wedza'],
  'Mashonaland West': ['Chegutu', 'Hurungwe', 'Kariba', 'Makonde', 'Mhondoro-Ngezi', 'Sanyati', 'Zvimba'],
  Masvingo: ['Bikita', 'Chiredzi', 'Chivi', 'Gutu', 'Masvingo', 'Mwenezi', 'Zaka'],
  'Matabeleland North': ['Binga', 'Bubi', 'Hwange', 'Lupane', 'Nkayi', 'Tsholotsho', 'Umguza'],
  'Matabeleland South': ['Beitbridge', 'Bulilima', 'Gwanda', 'Insiza', 'Mangwe', 'Matobo', 'Umzingwane'],
  Midlands: ['Chirumhanzu', 'Gokwe North', 'Gokwe South', 'Gweru', 'Kwekwe', 'Mberengwa', 'Shurugwi', 'Zvishavane'],
}

export const interests = [
  { slug: 'maize', name: 'Maize', category: 'Crop' },
  { slug: 'tobacco', name: 'Tobacco', category: 'Crop' },
  { slug: 'wheat', name: 'Wheat', category: 'Crop' },
  { slug: 'soybeans', name: 'Soybeans', category: 'Crop' },
  { slug: 'cotton', name: 'Cotton', category: 'Crop' },
  { slug: 'vegetables', name: 'Vegetables', category: 'Crop' },
  { slug: 'fruits', name: 'Fruits', category: 'Crop' },
  { slug: 'other-crops', name: 'Other crops', category: 'Crop' },
  { slug: 'cattle', name: 'Cattle', category: 'Livestock' },
  { slug: 'poultry', name: 'Poultry', category: 'Livestock' },
  { slug: 'goats', name: 'Goats', category: 'Livestock' },
  { slug: 'sheep', name: 'Sheep', category: 'Livestock' },
  { slug: 'pigs', name: 'Pigs', category: 'Livestock' },
  { slug: 'other-livestock', name: 'Other livestock', category: 'Livestock' },
] as const