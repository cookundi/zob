import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';

const REGEX = {
  EVM: /^0x[a-fA-F0-9]{40}$/,
  USERNAME: /^[a-zA-Z0-9_]{1,15}$/,
  X_LINK: /^https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+(\?.*)?$/
};

// Added 'success' state here
type ViewMode = 'apply' | 'check' | 'success'; 
type TaskState = 'idle' | 'verifying' | 'input' | 'completed';

export default function App() {
  const [view, setView] = useState<ViewMode>('apply');
  const [refCode, setRefCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    likeRtLink: '',
    commentLink: '',
    quoteLink: '',
    wallet: ''
  });

  const [tasks, setTasks] = useState({
    follow: 'idle' as TaskState,
    likeRt: 'idle' as TaskState,
    comment: 'idle' as TaskState,
    quote: 'idle' as TaskState,
    wallet: 'input' as TaskState,
  });

  const [checkQuery, setCheckQuery] = useState('');
  const [checkResult, setCheckResult] = useState<{ status: string, points: number } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setRefCode(ref);
  }, []);

  const handleTaskClick = (taskKey: keyof typeof tasks, url: string) => {
    window.open(url, '_blank');
    setTasks(prev => ({ ...prev, [taskKey]: 'verifying' }));
    
    setTimeout(() => {
      setTasks(prev => ({ ...prev, [taskKey]: 'input' }));
      toast('AWAITING INPUT', { style: { background: '#fff', color: '#000', border: '1px solid #000', borderRadius: '0', fontFamily: 'VT323', fontSize: '1rem' }});
    }, 3000);
  };

  const handleValidation = (taskKey: keyof typeof tasks, value: string, regex: RegExp) => {
    if (regex.test(value)) {
      setTasks(prev => ({ ...prev, [taskKey]: 'completed' }));
      toast('DATA VERIFIED', { style: { background: '#fffb00', color: '#000', border: '1px solid #000', borderRadius: '0', fontFamily: 'VT323', fontSize: '1rem' }});
    } else {
      toast('INVALID FORMAT', { style: { background: '#ff00ea', color: '#fff', border: '1px solid #000', borderRadius: '0', fontFamily: 'VT323', fontSize: '1rem' }});
    }
  };

  const submitApplication = async () => {
    const allCompleted = Object.values(tasks).every(t => t === 'completed');
    if (!allCompleted) {
      toast('COMPLETE ALL TASKS FIRST', { style: { background: '#ff00ea', color: '#fff', border: '1px solid #000', borderRadius: '0', fontFamily: 'VT323', fontSize: '1rem' }});
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/submit', {
        method: 'POST',
        body: JSON.stringify({ ...formData, referrer: refCode })
      });
      
      if (res.ok) {
        // Show success UI instead of just copying
        setView('success');
      } else if (res.status === 409) {
        // Handle Duplicate Entry Error specifically
        toast('HANDLE OR EVM HAS BEEN SUBMITTED BY SOMEONE ELSE', { style: { background: '#ff00ea', color: '#fff', border: '1px solid #000', borderRadius: '0', fontFamily: 'VT323', fontSize: '1rem' }});
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      toast('SUBMISSION FAILED. TRY AGAIN.', { style: { background: '#ff00ea', color: '#fff', border: '1px solid #000', borderRadius: '0', fontFamily: 'VT323', fontSize: '1rem' }});
    } finally {
      setIsSubmitting(false);
    }
  };

  const runChecker = async () => {
    if (!checkQuery) return;
    setIsChecking(true);
    setCheckResult(null); 

    try {
      const res = await fetch(`/.netlify/functions/check?q=${encodeURIComponent(checkQuery)}`);
      
      if (res.ok) {
        const data = await res.json();
        setCheckResult({ status: data.status, points: data.ref_points });
      } else {
        toast('IDENTIFIER NOT FOUND', { style: { background: '#ff00ea', color: '#fff', border: '1px solid #000', borderRadius: '0', fontFamily: 'VT323', fontSize: '1rem' }});
      }
    } catch (error) {
      toast('NETWORK ERROR', { style: { background: '#ff00ea', color: '#fff', border: '1px solid #000', borderRadius: '0', fontFamily: 'VT323', fontSize: '1rem' }});
    } finally {
      setIsChecking(false);
    }
  };

  const copyReferralLink = () => {
    const refLink = `${window.location.origin}?ref=${formData.username}`;
    navigator.clipboard.writeText(refLink);
    toast('LINK COPIED TO CLIPBOARD', { style: { background: '#fffb00', color: '#000', border: '1px solid #000', borderRadius: '0', fontFamily: 'VT323', fontSize: '1rem' }});
  };

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col font-vt323 tracking-wide">
      <Toaster position="bottom-right" />
      
      <header className="mb-10 border-b border-black pb-4 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-4xl m-0 leading-none">ZOBWORLD</h1>
          <p className="text-md text-gray-600 m-0 mt-1">WHITELIST APPLICATION</p>
        </div>
        <div className="flex gap-4 text-xl">
          <button onClick={() => setView('apply')} className={view === 'apply' ? 'text-black' : 'text-gray-400 hover:text-black cursor-pointer'}>
            [ APPLY ]
          </button>
          <button onClick={() => setView('check')} className={view === 'check' ? 'text-black' : 'text-gray-400 hover:text-black cursor-pointer'}>
            [ CHECK_ID ]
          </button>
        </div>
      </header>

      {view === 'apply' && (
        <div className="space-y-4">
          <TaskBlock num="01" title="FOLLOW X" desc="Follow @ZOBWORLD" state={tasks.follow} value={formData.username} placeholder="@username" regex={REGEX.USERNAME} onChange={(v: any) => setFormData({...formData, username: v})} onAction={() => handleTaskClick('follow', 'https://x.com')} onValidate={() => handleValidation('follow', formData.username, REGEX.USERNAME)} activeBg="bg-zob-cyan/10" />
          <TaskBlock num="02" title="LIKE & RT" desc="Interact with this post" state={tasks.likeRt} value={formData.likeRtLink} placeholder="https://x.com/.../status/..." regex={REGEX.X_LINK} onChange={(v: any) => setFormData({...formData, likeRtLink: v})} onAction={() => handleTaskClick('likeRt', 'https://x.com/pinned')} onValidate={() => handleValidation('likeRt', formData.likeRtLink, REGEX.X_LINK)} activeBg="bg-zob-pink/10" />
          <TaskBlock num="03" title="COMMENT" desc="Tag 2 friends in the comments" state={tasks.comment} value={formData.commentLink} placeholder="https://x.com/.../status/..." regex={REGEX.X_LINK} onChange={(v: any) => setFormData({...formData, commentLink: v})} onAction={() => handleTaskClick('comment', 'https://x.com/pinned')} onValidate={() => handleValidation('comment', formData.commentLink, REGEX.X_LINK)} activeBg="bg-zob-yellow/20" />
          <TaskBlock num="04" title="QUOTE" desc="Quote post with 'ZOB_WORLD' " state={tasks.quote} value={formData.quoteLink} placeholder="https://x.com/.../status/..." regex={REGEX.X_LINK} onChange={(v: any) => setFormData({...formData, quoteLink: v})} onAction={() => handleTaskClick('quote', 'https://x.com/pinned')} onValidate={() => handleValidation('quote', formData.quoteLink, REGEX.X_LINK)} activeBg="bg-zob-cyan/10" />
          
          <div className={`border border-black p-3 flex flex-col gap-3 transition-colors ${tasks.wallet === 'completed' ? 'bg-zob-pink/10' : 'bg-white'}`}>
            <div className="flex justify-between items-center text-base">
              <span>05. EVM ADDRESS</span>
              {tasks.wallet === 'completed' ? <span className="text-sm">[ OK ]</span> : <span className="text-sm text-gray-400">[ REQ ]</span>}
            </div>
            {tasks.wallet !== 'completed' && (
              <div className="flex gap-2 text-sm">
                <input type="text" value={formData.wallet} onChange={(e) => setFormData({...formData, wallet: e.target.value})} placeholder="0x..." className="flex-1 bg-transparent border-b border-gray-300 outline-none focus:border-black px-1" />
                <button onClick={() => handleValidation('wallet', formData.wallet, REGEX.EVM)} className="border border-black px-3 hover:bg-black hover:text-white cursor-pointer">
                  VERIFY
                </button>
              </div>
            )}
          </div>

          <button onClick={submitApplication} disabled={isSubmitting} className="w-full mt-6 border cursor-pointer border-black bg-white hover:bg-black hover:text-white text-lg py-3 transition-colors disabled:opacity-50">
            {isSubmitting ? ' PROCESSING... ' : 'SUBMIT APPLICATION'}
          </button>
        </div>
      )}

      {/* NEW SUCCESS VIEW */}
      {view === 'success' && (
        <div className="border border-black bg-white p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
          <h2 className="text-3xl mb-2 text-black">DOSSIER SECURED.</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-sm">
            INCREASE YOUR CHANCES FOR APPROVAL BY REFERRING OTHERS TO ZOBWORLD.
          </p>

          <div className="w-full border border-black p-4 bg-zob-yellow/20 flex flex-col gap-3">
            <span className="text-sm text-gray-500 text-left">YOUR UNIQUE REF LINK:</span>
            <div className="flex gap-2 items-center">
              <input 
                type="text" 
                readOnly 
                value={`${window.location.origin}?ref=${formData.username}`} 
                className="flex-1 bg-white border border-black px-2 py-2 text-lg outline-none selection:bg-black selection:text-white"
              />
              <button 
                onClick={copyReferralLink} 
                className="border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors cursor-pointer text-lg"
              >
                [ COPY ]
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'check' && (
        <div className="border border-black bg-white p-6 flex flex-col items-center">
          <p className="text-base mb-4">ENTER IDENTIFIER (X USERNAME OR 0X...)</p>
          <div className="flex gap-2 w-full max-w-sm mb-6">
            <input type="text" value={checkQuery} onChange={(e) => setCheckQuery(e.target.value)} className="flex-1 border-b border-black outline-none px-2 text-center text-lg bg-transparent" />
            <button onClick={runChecker} disabled={isChecking} className="border border-black px-4 hover:bg-black hover:text-white cursor-pointer disabled:opacity-50">
              {isChecking ? '[ ... ]' : '[ SEARCH ]'}
            </button>
          </div>

          {checkResult && (
            <div className="w-full max-w-sm border border-black p-4 bg-zob-yellow/20 flex flex-col gap-2 text-lg animate-in fade-in">
              <div className="flex justify-between border-b border-black/20 pb-1">
                <span>STATUS:</span> <span>{checkResult.status}</span>
              </div>
              <div className="flex justify-between">
                <span>REFS:</span> <span>{checkResult.points}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskBlock({ num, title, desc, state, value, onChange, onAction, onValidate, placeholder, regex, activeBg }: any) {
  return (
    <div className={`border border-black p-3 transition-colors ${state === 'completed' ? activeBg : 'bg-white'}`}>
      <div className="flex justify-between items-center text-base">
        <div className="flex gap-3">
          <span className="text-gray-400 mt-1">{num}.</span>
          <span className='text-xl'>{title} <span className="text-[16px] text-gray-500 ml-2 hidden sm:inline">({desc})</span></span>
        </div>
        {state === 'idle' && <button onClick={onAction} className="text-sm cursor-pointer hover:underline">[ GO ]</button>}
        {state === 'verifying' && <span className="text-sm text-gray-500">[ WAIT ]</span>}
        {state === 'completed' && <span className="text-sm">[ OK ]</span>}
      </div>
      {state === 'input' && (
        <div className="flex gap-2 mt-3 text-sm animate-in fade-in">
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent border-b border-gray-300 outline-none focus:border-black px-1" />
          <button onClick={onValidate} className="border border-black cursor-pointer px-3 hover:bg-black hover:text-white">VERIFY</button>
        </div>
      )}
    </div>
  );
}