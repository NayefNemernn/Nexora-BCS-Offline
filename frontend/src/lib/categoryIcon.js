export function getCategoryIcon(name = "") {
  const n = name.toLowerCase();

  if (/drink|bev|juice|water|soda/.test(n) ||
      /مشروب|عصير|ماء|مياه|سودا|كولا|نكتار/.test(name))           return "🥤";
  if (/snack|chip|crisp|nuts|biscuit/.test(n) ||
      /وجبة خفيفة|شيبس|مكسرات|بسكويت|كعك|محمصات/.test(name))     return "🍟";
  if (/dairy|milk|cheese|yogurt|cream/.test(n) ||
      /ألبان|حليب|جبن|جبنة|زبادي|قشطة|زبدة|لبن/.test(name))      return "🧀";
  if (/bak|bread|cake|pastry/.test(n) ||
      /مخبوز|خبز|كيك|معجنات|فطير|توست|كرواسان/.test(name))        return "🍞";
  if (/med|pharma|health/.test(n) ||
      /دواء|أدوية|صيدل|صحة|مسكن|فيتامين/.test(name))              return "💊";
  if (/care|hygiene|soap|shampoo|beauty/.test(n) ||
      /عناية|صابون|شامبو|نظافة|جمال|كريم|مرطب|عطر/.test(name))   return "🧴";
  if (/electron|tech|phone|cable/.test(n) ||
      /إلكترون|هاتف|جوال|تقنية|كابل|شاحن|سماعة/.test(name))      return "📱";
  if (/clean|deterg/.test(n) ||
      /تنظيف|منظف|غسيل|جلي|مطهر|كلور/.test(name))                return "🧹";
  if (/meat|chicken|beef|fish|poultry/.test(n) ||
      /لحم|لحوم|دجاج|سمك|فروج|مأكولات بحرية/.test(name))         return "🥩";
  if (/fruit|veg|produce/.test(n) ||
      /فاكهة|فواكه|خضار|خضروات/.test(name))                       return "🥦";
  if (/frozen|ice/.test(n) ||
      /مجمد|مجمدات|ثلج/.test(name))                               return "❄️";
  if (/sweet|candy|choc|sugar/.test(n) ||
      /حلوى|حلويات|شوكولا|سكر|كاندي|مربى/.test(name))            return "🍫";
  if (/coffee|tea/.test(n) ||
      /قهوة|شاي|نسكافيه|كابتشينو|نعناع/.test(name))              return "☕";
  if (/sauce|condiment|spice/.test(n) ||
      /صلصة|توابل|بهارات|كاتشب|خل|ملح/.test(name))               return "🧂";
  if (/can|tin|preserved|conserv/.test(n) ||
      /معلب|معلبات|مخلل|مربى|محفوظ/.test(name))                  return "🥫";
  if (/baby|infant|diaper/.test(n) ||
      /أطفال|طفل|حفاض|حفاضات|رضاعة/.test(name))                  return "👶";
  if (/tobac|cigaret|smoke/.test(n) ||
      /سجائر|تبغ|دخان/.test(name))                                return "🚬";

  return "📦";
}
