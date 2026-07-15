import { createContext, useContext } from "react";

// Vertaalwoordenboek. Dutch is default; English is de tweede taal.
export const DICT = {
  nl: {
    ai_summary: "AI Summary", period: "Periode",
    devices: "Apparaten", devices_sub: "Aandeel gebruikers en conversieratio per apparaat",
    location: "Locatie", top_cities: "Top steden", top_countries: "Top landen",
    demographics: "Demografie", demographics_sub: "Leeftijd en geslacht, uit GA4",
    business_insights: "Business insights", copy: "Kopieer", report: "Rapport",
    generate_report: "Genereer rapport", generating: "Bezig...",
    settings: "Instellingen", profile: "Profiel",
    dark_mode: "Donkere modus", language: "Taal",
    most_visitors: "Meeste bezoekers", most_sales: "Meeste verkopen",
    biggest_risers: "Grootste stijgers", biggest_fallers: "Grootste dalers",
  },
  en: {
    ai_summary: "AI Summary", period: "Period",
    devices: "Devices", devices_sub: "Share of users and conversion rate per device",
    location: "Location", top_cities: "Top cities", top_countries: "Top countries",
    demographics: "Demographics", demographics_sub: "Age and gender, from GA4",
    business_insights: "Business insights", copy: "Copy", report: "Report",
    generate_report: "Generate report", generating: "Working...",
    settings: "Settings", profile: "Profile",
    dark_mode: "Dark mode", language: "Language",
    most_visitors: "Most visitors", most_sales: "Most sales",
    biggest_risers: "Biggest risers", biggest_fallers: "Biggest fallers",
  },
};

export const UIContext = createContext({ lang: "nl", setLang: () => {}, theme: "light", setTheme: () => {} });
export const useUI = () => useContext(UIContext);
export function useT() {
  const { lang } = useUI();
  return (key) => (DICT[lang] && DICT[lang][key]) || (DICT.nl[key] || key);
}
