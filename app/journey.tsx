'use client';
import type { Content } from './content';
import { useLanguage } from './language';

export function Journey({ entries }: { entries: Content['journey'] }) {
  const { t } = useLanguage();
  const isEducation = (entry: Content['journey'][number]) => /Master|Bachelor|Maturité/.test(entry.title);
  const education = entries.filter(isEducation).sort((a,b)=>(b.start||'').localeCompare(a.start||''));
  const experience = entries.filter(e=>!isEducation(e));
  // Academic periods anchor the layout. An experience appears in every period
  // it overlaps, with its full dates visible, rather than implying succession.
  const periods = education.map(entry => ({
    label: `${entry.start?.slice(0,4)} — ${entry.end?.slice(0,4) || t('present','aujourd’hui')}`,
    education: [entry],
    experience: experience.filter(e => e.start && e.start <= (entry.end?.length===4 ? entry.end+'-12' : entry.end || '9999') && (!e.end || (e.end.length===4 ? e.end+'-12' : e.end) >= (entry.start?.length===4 ? entry.start+'-01' : entry.start || '0000')))
      .sort((a,b)=>(b.start||'').localeCompare(a.start||'')),
  }));
  const others=experience.filter(e=>!periods.some(p=>p.experience.includes(e))).sort((a,b)=>(b.start||'').localeCompare(a.start||''));
  if(others.length) periods.push({label:t('Other periods','Autres périodes'),education:[],experience:others});
  const card=(entry:Content['journey'][number])=><article className="dual-entry" key={entry.title}><span className="eyebrow">{entry.period}</span><h3>{entry.title}</h3><p>{entry.text}</p></article>;
  return <div className="dual-timeline">
    <div className="dual-head"><h3>{t('Education','Formation')}</h3><span/><h3>{t('Experience','Expérience')}</h3></div>
    {periods.map(period=><section className="dual-period" key={period.label} aria-label={period.label}>
      <div className="dual-education"><span className="dual-mobile-label">{t('Education','Formation')}</span>{period.education.map(card)}</div>
      <div className="dual-axis"><span className="dual-dot"/><span className="dual-year">{period.label}</span></div>
      <div className="dual-experience"><span className="dual-mobile-label">{t('Experience','Expérience')}</span>{period.experience.map(card)}</div>
    </section>)}
  </div>;
}
