'use client'

import { useEffect, useRef, useState } from 'react'

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stats, setStats] = useState({
    uptime: '99.7%',
    latency: '85ms',
    nodes: '1',
    requests: '1.8M'
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Array<{x:number,y:number,vx:number,vy:number,label:string}> = []
    const labels = ['AP-N','AP-S','US-W','US-E','EU-W','SEA']

    for (let i = 0; i < 6; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        label: labels[i]
      })
    }

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      })

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < 300) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(64,138,113,${0.3 * (1 - dist/300)})`
            ctx.lineWidth = 0.8
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      particles.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#5CB89A'
        ctx.fill()
        ctx.fillStyle = 'rgba(92,184,154,0.7)'
        ctx.font = '10px monospace'
        ctx.fillText(p.label, p.x + 6, p.y - 6)
      })

      requestAnimationFrame(animate)
    }
    animate()
  }, [])

  return (
    <div style={{background:'#0A0E14',minHeight:'100vh',color:'#fff',fontFamily:'Inter,sans-serif',position:'relative',overflow:'hidden'}}>
      <canvas ref={canvasRef} style={{position:'fixed',top:0,left:0,zIndex:0,opacity:0.6}} />

      {/* NAV */}
      <nav style={{position:'relative',zIndex:10,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 32px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#5CB89A',display:'inline-block'}}></span>
          <span style={{fontWeight:700,fontSize:14,letterSpacing:'0.1em'}}>SATELINK</span>
          <span style={{background:'rgba(64,138,113,0.2)',color:'#5CB89A',fontSize:10,padding:'2px 6px',borderRadius:4,border:'1px solid rgba(92,184,154,0.3)'}}>BETA</span>
        </div>
        <div style={{display:'flex',gap:'32px',fontSize:13,color:'rgba(255,255,255,0.6)'}}>
          <a href="/calculator" style={{color:'inherit',textDecoration:'none'}}>Developers</a>
          <a href="/calculator" style={{color:'inherit',textDecoration:'none'}}>Nodes</a>
          <a href="/status" style={{color:'inherit',textDecoration:'none'}}>Network</a>
          <a href="/calculator" style={{color:'inherit',textDecoration:'none'}}>Pricing</a>
          <a href="/compare" style={{color:'inherit',textDecoration:'none'}}>Compare</a>
        </div>
        <a href="/app" style={{background:'#408A71',color:'#fff',padding:'8px 20px',borderRadius:6,fontSize:13,fontWeight:600,textDecoration:'none'}}>Launch App →</a>
      </nav>

      {/* HERO */}
      <div style={{position:'relative',zIndex:10,textAlign:'center',padding:'120px 32px 80px'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(64,138,113,0.1)',border:'1px solid rgba(92,184,154,0.3)',borderRadius:20,padding:'6px 16px',marginBottom:32,fontSize:12,color:'#5CB89A'}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'#5CB89A',animation:'pulse 2s infinite',display:'inline-block'}}></span>
          Public Beta · Polygon Mainnet · USDT Settlement
        </div>

        <h1 style={{fontSize:'clamp(36px,6vw,72px)',fontWeight:700,lineHeight:1.1,marginBottom:24,maxWidth:800,margin:'0 auto 24px'}}>
          Infrastructure Network for<br/>
          <span style={{color:'#5CB89A'}}>RPC, AI, and Machine APIs</span>
        </h1>

        <p style={{fontSize:18,color:'rgba(255,255,255,0.5)',maxWidth:560,margin:'0 auto 48px',lineHeight:1.6}}>
          Satelink routes real workloads through decentralized infrastructure nodes worldwide. Every API call settles as USDT on Polygon.
        </p>

        <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
          <a href="/app" style={{background:'#5CB89A',color:'#0A0E14',padding:'14px 32px',borderRadius:8,fontWeight:700,fontSize:15,textDecoration:'none'}}>Launch Console</a>
          <a href="/calculator" style={{background:'transparent',color:'#fff',padding:'14px 32px',borderRadius:8,fontWeight:600,fontSize:15,textDecoration:'none',border:'1px solid rgba(255,255,255,0.15)'}}>Run a Node</a>
          <a href="https://github.com/Satelink-Protocol/Satelink_Network/wiki" style={{background:'transparent',color:'rgba(255,255,255,0.5)',padding:'14px 32px',borderRadius:8,fontWeight:600,fontSize:15,textDecoration:'none',border:'1px solid rgba(255,255,255,0.08)'}}>View Docs</a>
        </div>
      </div>

      {/* LIVE STATS */}
      <div style={{position:'relative',zIndex:10,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1,background:'rgba(255,255,255,0.04)',margin:'0 32px',borderRadius:12,overflow:'hidden',border:'1px solid rgba(255,255,255,0.06)'}}>
        {[
          {label:'UPTIME (30D)',value:stats.uptime,color:'#5CB89A'},
          {label:'AVG LATENCY',value:stats.latency,color:'#fff'},
          {label:'API REQUESTS',value:stats.requests,color:'#fff'},
          {label:'ACTIVE NODES',value:stats.nodes,color:'#fff'},
        ].map((s,i) => (
          <div key={i} style={{padding:'28px 24px',background:'rgba(10,14,20,0.8)'}}>
            <div style={{fontSize:10,letterSpacing:'0.1em',color:'rgba(255,255,255,0.3)',marginBottom:8}}>{s.label}</div>
            <div style={{fontSize:32,fontWeight:700,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* WHAT IS SATELINK */}
      <div style={{position:'relative',zIndex:10,maxWidth:720,margin:'80px auto',padding:'0 32px'}}>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:40}}>
          <h2 style={{fontSize:18,fontWeight:600,marginBottom:16}}>What is Satelink?</h2>
          <p style={{color:'rgba(255,255,255,0.5)',lineHeight:1.7,margin:0}}>
            Satelink is an autonomous economic protocol that connects developers needing infrastructure (RPC, AI inference, webhooks, compute) with node operators running distributed hardware. Every request is metered, billed in USDT, and settled automatically via smart contracts on Polygon. Node operators earn 50% of all revenue with zero human intervention required.
          </p>
        </div>
      </div>

      {/* FEATURES GRID */}
      <div style={{position:'relative',zIndex:10,maxWidth:1100,margin:'0 auto 80px',padding:'0 32px'}}>
        <h2 style={{textAlign:'center',fontSize:32,fontWeight:700,marginBottom:48}}>Everything You Need to Build</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          {[
            {icon:'⚡',title:'Low Latency',desc:'<100ms average response time globally'},
            {icon:'💰',title:'Pay Per Call',desc:'No monthly fees. $0.000030/call. Scale freely.'},
            {icon:'🔗',title:'Multi-Chain',desc:'Ethereum, Polygon, Base, Arbitrum endpoints'},
            {icon:'🔒',title:'Secure',desc:'On-chain settlement. No custody. No trust.'},
            {icon:'📊',title:'Transparent',desc:'All transactions verified on Polygonscan'},
            {icon:'🌍',title:'Global',desc:'Distributed node network across regions'},
          ].map((f,i) => (
            <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:28}}>
              <div style={{fontSize:28,marginBottom:12}}>{f.icon}</div>
              <div style={{fontWeight:600,marginBottom:8}}>{f.title}</div>
              <div style={{color:'rgba(255,255,255,0.4)',fontSize:13,lineHeight:1.5}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{position:'relative',zIndex:10,borderTop:'1px solid rgba(255,255,255,0.06)',padding:'48px 32px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:32,maxWidth:1100,margin:'0 auto'}}>
        {[
          {title:'Product',links:[['RPC Gateway','/app'],['Calculator','/calculator'],['Status','/status'],['Compare','/compare']]},
          {title:'Developers',links:[['Documentation','https://github.com/Satelink-Protocol/Satelink_Network/wiki'],['API Reference','/app'],['GitHub','https://github.com/Satelink-Protocol']]},
          {title:'Company',links:[['About','/about'],['Careers','/careers'],['Blog','/blog'],['Press','/press']]},
          {title:'Legal',links:[['Privacy Policy','/legal/privacy'],['Terms of Service','/legal/terms']]},
        ].map((col,i) => (
          <div key={i}>
            <div style={{fontSize:11,letterSpacing:'0.1em',color:'rgba(255,255,255,0.3)',marginBottom:16}}>{col.title}</div>
            {col.links.map(([label,href],j) => (
              <a key={j} href={href} style={{display:'block',color:'rgba(255,255,255,0.5)',textDecoration:'none',fontSize:13,marginBottom:10}}>{label}</a>
            ))}
          </div>
        ))}
      </footer>
    </div>
  )
}
