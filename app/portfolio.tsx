'use client';
import { pagesBuild, pagePath, sitePath } from './site-path';
import { useLanguage, LanguageSwitcher } from './language';

import { useEffect, useState } from 'react';
import { Journey } from './journey';
import { initialContent, type Content, type Project } from './content';

export function useContent() {
  const { language } = useLanguage();
  const [content, setContent] = useState<Content>(initialContent);
  useEffect(() => { if (pagesBuild) return; const controller = new AbortController(); fetch('/api/content', {signal:controller.signal}).then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<Content>; }).then(c => { if (c) setContent(c); }).catch(() => {}); return () => controller.abort(); }, []);
  const localize = <T extends {fr?: Record<string,string>}>(item:T):T => language === 'fr' ? {...item,...item.fr} : item;
  return {...content, projects:content.projects.map(localize), journey:content.journey.map(localize), entries:content.entries.map(localize), tracks:content.tracks.map(localize)};
}
export function Header({ active = 'about' }: { active?: string }) {
 const { t } = useLanguage();
  return <header className="site-header"><a className="wordmark" href={pagePath("/")}>Loïc Misenta<span className="name-dot">.</span></a><nav aria-label={t("Main navigation","Navigation principale")}><a aria-current={active === 'about' ? 'page' : undefined} href={pagePath("/")}>{t("About","À propos")}</a><a aria-current={active === 'projects' ? 'page' : undefined} href={pagePath("/projects")}>{t("Projects","Projets")}</a><a aria-current={active === 'owly' ? 'page' : undefined} href={pagePath("/owly")}>OWLY ↗</a></nav><LanguageSwitcher/></header>;
}
export function Footer({ content }: { content: Content }) {
 const { t } = useLanguage();
  return <footer id="contact"><h2>Contact</h2><a className="email-link" href={`mailto:${content.email}`}>{content.email} ↗</a><div className="footer-bottom"><span>© {new Date().getFullYear()} Loïc Misenta</span><div><a href={content.github} target="_blank" rel="noreferrer">GitHub ↗</a><a href={content.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a><a href={`mailto:${content.email}`}>Email ↗</a></div><a href="#top">{t("Back to top ↑","Haut de page ↑")}</a></div></footer>;
}
export function ProjectItem({ project: p, index }: { project: Project; index: number }) {
 const { t } = useLanguage();
  return <article className="project-item" id={p.id}><aside className="project-index"><span>{String(index+1).padStart(2,'0')}</span><span>{p.category}</span></aside><div className="project-description"><h3>{p.title}</h3><p className="project-summary">{p.summary}</p>{p.cover && <img className="project-image" src={sitePath(p.cover)} alt={p.title} loading="lazy"/>}<p className="project-context">{p.problem}</p>{p.video && <MediaVideo src={p.video} title={p.title}/>}<div className="project-body"><section><h4>{t("Method","Méthode")}</h4><p>{p.architecture}</p></section><section><h4>{t("Results","Résultats")}</h4><p>{p.impact}</p></section></div><div className="project-bottom"><div className="tags">{p.tags.map(tag => <span key={tag}>{tag}</span>)}</div>{p.code && <a className="text-link" href={p.code} target="_blank" rel="noreferrer">{t("Code & report ↗","Code & rapport ↗")}</a>}</div></div></article>;
}
export function MediaVideo({ src, title }: {src: string; title: string}) {
 const { t } = useLanguage();
  const [error,setError] = useState(false);
  useEffect(()=>setError(false),[src]);
  return <div><video controls playsInline preload="metadata" src={sitePath(src)} aria-label={title} onError={() => setError(true)} />{error && <p role="status">{t("The video could not be played.","La vidéo ne peut pas être lue.")} <a href={sitePath(src)}>{t("Open file ↗","Ouvrir le fichier ↗")}</a></p>}</div>;
}
export default function Portfolio() {
 const { t } = useLanguage();
  const content = useContent();
  return <div id="top"><a className="skip-link" href="#main">{t("Skip to content","Aller au contenu")}</a><Header/><main id="main"><section className="intro"><div><p className="eyebrow">DATA SCIENCE · EPFL</p><h1>Loïc Misenta</h1><p className="intro-role">Data Science & Machine Learning</p></div><div className="intro-bio"><p>{t("Data Science master’s student at EPFL. My projects focus on machine learning, software development and robotics.","Étudiant en master de Data Science à l’EPFL. Mes projets portent sur le machine learning, le développement logiciel et la robotique.")}</p><div className="intro-links"><a href={content.github}>GitHub ↗</a><a href={content.linkedin}>LinkedIn ↗</a><a href={`mailto:${content.email}`}>Email ↗</a></div></div></section><section className="about section-wrap" id="parcours"><div className="section-heading"><h2>{t("Background","Parcours")}</h2></div><Journey entries={content.journey}/><div className="stack"><h3>{t("Technologies","Technologies")}</h3><div>{['Python', 'PyTorch', 'LightGBM', 'NumPy / Pandas', 'Jupyter', 'Git', 'C / C#', 'n8n'].map(x=><span key={x}>{x}</span>)}</div></div></section><section className="elsewhere section-wrap"><a href={pagePath("/projects")}><div><h2>{t("Projects","Projets")}</h2><p>{t("Machine learning, software and robotics.","Machine learning, logiciel et robotique.")}</p></div><span>↗</span></a><a href={pagePath("/owly")}><div><h2>OWLY</h2><p>{t("My music.","Ma musique.")}</p></div><span>↗</span></a></section></main><Footer content={content}/></div>;
}

export function ProjectsPage() { const { t } = useLanguage(); const content = useContent(); return <div id="top"><a className="skip-link" href="#main">{t("Skip to content","Aller au contenu")}</a><Header active="projects"/><main id="main"><section className="projects-intro section-wrap"><h1>{t("Projects","Projets")}</h1><p>{t("Machine learning, software development and robotics.","Machine learning, développement logiciel et robotique.")}</p></section><section className="projects section-wrap" id="projects"><div className="section-heading"><h2>{t("Projects","Projets")}</h2><span className="eyebrow">{String(content.projects.length).padStart(2,'0')} {t("PROJECTS","PROJETS")}</span></div><div className="projects-list">{content.projects.map((p,i) => <ProjectItem key={p.id} project={p} index={i}/>)}</div><a className="all-code" href={content.github} target="_blank" rel="noreferrer">{t("All GitHub repositories ↗","Tous les dépôts GitHub ↗")}</a></section></main><Footer content={content}/></div>; }
