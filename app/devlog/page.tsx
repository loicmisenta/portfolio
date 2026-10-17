'use client';
import { pagePath } from '../site-path';
import { useEffect } from 'react';
export default function Devlog() { useEffect(() => { window.location.replace(pagePath('/')); }, []); return <main className="section-wrap"><a href={pagePath("/")}>About ?</a></main>; }
