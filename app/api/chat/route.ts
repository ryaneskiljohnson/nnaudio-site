import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cymasphereRAG } from '@/lib/rag';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatRequest {
  message: string;
  conversationHistory: ChatMessage[];
  language?: string;
}

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Multilingual FAQ responses
const FAQ_RESPONSES: Record<string, Record<string, { keywords: string[], response: string }>> = {
  en: {
    smalltalk: {
      keywords: [
        'how are you',
        "how's it going",
        'hows it going',
        "what's up",
        'whats up',
        'sup',
        'yo',
        'hey there'
      ],
      response: "I'm doing great and ready to help with NNAudio products, downloads, or your account. Are you looking for plugins, bundles, or help with NNAudio Access?"
    },
    pricing: {
      keywords: ['price', 'cost', 'pricing', 'subscription', 'plan', 'free', 'trial', 'money'],
      response: "NNAudio offers individual plugins and packs (one-time purchase) and bundles—some with lifetime options and some with monthly or annual subscriptions. Check the product and bundle pages on nnaud.io for current prices. Need help choosing?"
    },
    features: {
      keywords: ['feature', 'tool', 'synthesizer', 'drum', 'instrument', 'effect', 'what can', 'capabilities'],
      response: "NNAudio sells plugins (AU/VST3), sample packs, and MIDI. Use NNAudio Access to download and install everything from one place. What are you looking for—plugins, packs, or bundles?"
    },
    getting_started: {
      keywords: ['start', 'begin', 'how to', 'tutorial', 'learn', 'new user', 'first time'],
      response: "Get started by downloading NNAudio Access from the product page, installing it, and logging in with your nnaud.io account. Your products will appear there for download and installation. You can also use My Products in your dashboard on the website."
    },
    support: {
      keywords: ['help', 'support', 'problem', 'issue', 'bug', 'contact', 'customer service'],
      response: "Log in to your account and go to Support to create a ticket, or email support@nnaud.io. Describe your issue (e.g. missing product, download problem, NNAudio Access) and we'll help."
    },
    comparison: {
      keywords: ['vs', 'compare', 'better than', 'alternative', 'competitor', 'fl studio', 'ableton', 'logic'],
      response: "NNAudio plugins work in major DAWs (Logic, Ableton, FL Studio, Cubase, Studio One, Reaper, Bitwig, etc.) as AU and VST3. What DAW are you using?"
    },
    technical: {
      keywords: ['system requirements', 'specs', 'compatible', 'browser', 'device', 'performance'],
      response: "Our plugins are AU and VST3 and work with major DAWs on Mac and Windows. NNAudio Access runs on macOS and Windows. Check each product page for specific requirements."
    }
  },
  es: {
    smalltalk: {
      keywords: ['¿cómo estás', 'hola', 'qué tal', 'hey', 'oye'],
      response: "¡Muy bien y listo para ayudarte con tu música! ¿Te estás enfocando en progresiones de acordes, melodías o en arreglar una canción completa?"
    },
    pricing: {
      keywords: ['precio', 'costo', 'precios', 'suscripción', 'plan', 'gratis', 'prueba', 'dinero'],
      response: "NNAudio ofrece plugins, packs y bundles (compra única o suscripción según el producto). Consulta las páginas de productos y bundles en nnaud.io para precios actuales. ¿Necesitas ayuda para elegir?"
    },
    features: {
      keywords: ['característica', 'herramienta', 'sintetizador', 'batería', 'instrumento', 'efecto', 'qué puedes', 'capacidades'],
      response: "NNAudio vende plugins (AU/VST3), packs de samples y MIDI. Usa NNAudio Access para descargar e instalar todo. ¿Buscas plugins, packs o bundles?"
    },
    getting_started: {
      keywords: ['empezar', 'comenzar', 'cómo', 'tutorial', 'aprender', 'usuario nuevo', 'primera vez'],
      response: "Descarga NNAudio Access desde la página del producto, instálalo e inicia sesión con tu cuenta nnaud.io. Tus productos aparecerán ahí para descargar e instalar. También puedes usar Mis Productos en el panel de control en la web."
    },
    support: {
      keywords: ['ayuda', 'soporte', 'problema', 'problema', 'bug', 'contacto', 'servicio al cliente'],
      response: "Inicia sesión y ve a Soporte para crear un ticket, o escribe a support@nnaud.io. Describe tu problema (producto faltante, descarga, NNAudio Access) y te ayudaremos."
    },
    comparison: {
      keywords: ['vs', 'comparar', 'mejor que', 'alternativa', 'competidor', 'fl studio', 'ableton', 'logic'],
      response: "Los plugins NNAudio funcionan en los DAW más usados (Logic, Ableton, FL Studio, Cubase, etc.) como AU y VST3. ¿Qué DAW usas?"
    },
    technical: {
      keywords: ['requisitos del sistema', 'especificaciones', 'compatible', 'navegador', 'dispositivo', 'rendimiento'],
      response: "Nuestros plugins son AU y VST3 y funcionan con los DAW principales en Mac y Windows. NNAudio Access funciona en macOS y Windows. Revisa cada página de producto para requisitos específicos."
    }
  },
  fr: {
    smalltalk: {
      keywords: ['comment ça va', 'ça va', 'salut', 'coucou', 'quoi de neuf'],
      response: "Je vais très bien et je suis prêt à vous aider avec votre musique. Vous vous concentrez sur les progressions d'accords, les mélodies ou l'arrangement d'une chanson complète ?"
    },
    pricing: {
      keywords: ['prix', 'coût', 'tarification', 'abonnement', 'plan', 'gratuit', 'essai', 'argent'],
      response: "NNAudio propose des plugins, packs et bundles (achat unique ou abonnement selon le produit). Consultez nnaud.io pour les prix. Besoin d'aide pour choisir ?"
    },
    features: {
      keywords: ['fonctionnalité', 'outil', 'synthétiseur', 'batterie', 'instrument', 'effet', 'que pouvez', 'capacités'],
      response: "NNAudio vend des plugins (AU/VST3), des packs de samples et du MIDI. Utilisez NNAudio Access pour tout télécharger et installer. Vous cherchez des plugins, des packs ou des bundles ?"
    },
    getting_started: {
      keywords: ['commencer', 'débuter', 'comment', 'tutoriel', 'apprendre', 'nouvel utilisateur', 'première fois'],
      response: "Téléchargez NNAudio Access depuis la page produit, installez-le et connectez-vous avec votre compte nnaud.io. Vos produits apparaîtront pour téléchargement et installation. Vous pouvez aussi utiliser Mes produits dans le tableau de bord sur le site."
    },
    support: {
      keywords: ['aide', 'support', 'problème', 'problème', 'bug', 'contact', 'service client'],
      response: "Connectez-vous et allez dans Support pour créer un ticket, ou écrivez à support@nnaud.io. Décrivez votre problème (produit manquant, téléchargement, NNAudio Access) et nous vous aiderons."
    },
    comparison: {
      keywords: ['vs', 'comparer', 'meilleur que', 'alternative', 'concurrent', 'fl studio', 'ableton', 'logic'],
      response: "Les plugins NNAudio fonctionnent dans les DAW majeurs (Logic, Ableton, FL Studio, Cubase, etc.) en AU et VST3. Quel DAW utilisez-vous ?"
    },
    technical: {
      keywords: ['configuration requise', 'spécifications', 'compatible', 'navigateur', 'appareil', 'performance'],
      response: "Nos plugins sont en AU et VST3 et fonctionnent avec les DAW majeurs sur Mac et Windows. NNAudio Access tourne sur macOS et Windows. Consultez chaque page produit pour les exigences."
    }
  },
  de: {
    smalltalk: {
      keywords: ['wie geht es dir', 'wie geht', 'hallo', 'hi', 'was geht'],
      response: "Mir geht es großartig und ich helfe gerne bei deiner Musik. Konzentrierst du dich auf Akkordfolgen, Melodien oder die Anordnung eines kompletten Songs ?"
    },
    pricing: {
      keywords: ['preis', 'kosten', 'preise', 'abonnement', 'plan', 'kostenlos', 'testversion', 'geld'],
      response: "NNAudio bietet Plugins, Packs und Bundles (Einmalkauf oder Abo). Preise findest du auf nnaud.io. Brauchst du Hilfe bei der Auswahl?"
    },
    features: {
      keywords: ['funktion', 'werkzeug', 'synthesizer', 'schlagzeug', 'instrument', 'effekt', 'was kann', 'funktionen'],
      response: "NNAudio verkauft Plugins (AU/VST3), Sample-Packs und MIDI. Nutze NNAudio Access zum Herunterladen und Installieren. Suchst du Plugins, Packs oder Bundles?"
    },
    getting_started: {
      keywords: ['anfang', 'beginnen', 'wie', 'anleitung', 'lernen', 'neuer benutzer', 'erstes mal'],
      response: "Lade NNAudio Access von der Produktseite herunter, installiere es und melde dich mit deinem nnaud.io-Konto an. Deine Produkte erscheinen dort zum Download. Du kannst auch unter Dashboard → Meine Produkte auf der Website nachsehen."
    },
    support: {
      keywords: ['hilfe', 'unterstützung', 'problem', 'problem', 'bug', 'kontakt', 'kundendienst'],
      response: "Melde dich an und gehe zu Support, um ein Ticket zu erstellen, oder schreibe an support@nnaud.io. Beschreibe dein Problem (fehlendes Produkt, Download, NNAudio Access), dann helfen wir dir."
    },
    comparison: {
      keywords: ['vs', 'vergleichen', 'besser als', 'alternative', 'konkurrenz', 'fl studio', 'ableton', 'logic'],
      response: "NNAudio-Plugins laufen in gängigen DAWs (Logic, Ableton, FL Studio, Cubase usw.) als AU und VST3. Welche DAW nutzt du?"
    },
    technical: {
      keywords: ['systemanforderungen', 'spezifikationen', 'kompatibel', 'browser', 'gerät', 'leistung'],
      response: "Unsere Plugins sind AU und VST3 und laufen mit gängigen DAWs auf Mac und Windows. NNAudio Access läuft auf macOS und Windows. Siehe die jeweilige Produktseite für Anforderungen."
    }
  },
  pt: {
    smalltalk: {
      keywords: ['como vai', 'tudo bem', 'oi', 'olá', 'e aí'],
      response: "Estou ótimo e pronto para ajudar com sua música. Você está se concentrando em progressões de acordes, melodias ou arranjando uma música completa ?"
    },
    pricing: {
      keywords: ['preço', 'custo', 'preços', 'assinatura', 'plano', 'grátis', 'teste', 'dinheiro'],
      response: "NNAudio oferece plugins, packs e bundles (compra única ou assinatura). Confira os preços em nnaud.io. Quer ajuda para escolher?"
    },
    features: {
      keywords: ['recurso', 'ferramenta', 'sintetizador', 'bateria', 'instrumento', 'efeito', 'o que pode', 'capacidades'],
      response: "NNAudio vende plugins (AU/VST3), packs de samples e MIDI. Use o NNAudio Access para baixar e instalar tudo. Você está procurando plugins, packs ou bundles?"
    },
    getting_started: {
      keywords: ['começar', 'iniciar', 'como', 'tutorial', 'aprender', 'novo usuário', 'primeira vez'],
      response: "Baixe o NNAudio Access na página do produto, instale e faça login com sua conta nnaud.io. Seus produtos aparecerão para download e instalação. Você também pode usar Meus Produtos no painel no site."
    },
    support: {
      keywords: ['ajuda', 'suporte', 'problema', 'problema', 'bug', 'contato', 'atendimento ao cliente'],
      response: "Faça login e vá em Suporte para criar um ticket, ou envie e-mail para support@nnaud.io. Descreva o problema (produto faltando, download, NNAudio Access) e ajudaremos."
    },
    comparison: {
      keywords: ['vs', 'comparar', 'melhor que', 'alternativa', 'concorrente', 'fl studio', 'ableton', 'logic'],
      response: "Os plugins NNAudio funcionam nos principais DAWs (Logic, Ableton, FL Studio, Cubase etc.) em AU e VST3. Qual DAW você usa?"
    },
    technical: {
      keywords: ['requisitos do sistema', 'especificações', 'compatível', 'navegador', 'dispositivo', 'desempenho'],
      response: "Nossos plugins são AU e VST3 e funcionam com os principais DAWs no Mac e no Windows. O NNAudio Access roda em macOS e Windows. Veja cada página de produto para requisitos."
    }
  },
  ja: {
    smalltalk: {
      keywords: ['元気', 'こんにちは', 'やあ', 'おはよう', 'こんばんは'],
      response: "お疲れ様です。あなたの音楽を手伝う準備ができています。コード進行、メロディ、または完全な曲のアレンジに焦点を当てていますか ?"
    },
    pricing: {
      keywords: ['価格', 'コスト', '料金', 'サブスクリプション', 'プラン', '無料', 'トライアル', 'お金'],
      response: "NNAudioはプラグイン、パック、バンドル（買い切りまたはサブスク）を提供しています。価格はnnaud.ioでご確認ください。選び方のサポートが必要ですか？"
    },
    features: {
      keywords: ['機能', 'ツール', 'シンセサイザー', 'ドラム', '楽器', 'エフェクト', 'できる', '機能'],
      response: "NNAudioはプラグイン（AU/VST3）、サンプルパック、MIDIを販売しています。NNAudio Accessでダウンロードとインストールができます。プラグイン、パック、バンドルのどれをお探しですか？"
    },
    getting_started: {
      keywords: ['始める', '開始', 'how to', 'チュートリアル', '学ぶ', '新規ユーザー', 'はじめて'],
      response: "NNAudio Accessを製品ページからダウンロードし、インストールしてnnaud.ioアカウントでログインしてください。製品が表示され、ダウンロード・インストールできます。サイトのダッシュボードの「マイプロダクト」からも確認できます。"
    },
    support: {
      keywords: ['助け', 'サポート', '問題', '問題', 'バグ', 'お問い合わせ', 'カスタマーサービス'],
      response: "ログインしてサポートでチケットを作成するか、support@nnaud.io にメールしてください。問題（製品がない、ダウンロード、NNAudio Accessなど）を説明していただければ対応します。"
    },
    comparison: {
      keywords: ['vs', '比較', 'より優れている', '代替案', '競合他社', 'fl studio', 'ableton', 'logic'],
      response: "NNAudioプラグインは主要DAW（Logic、Ableton、FL Studio、Cubaseなど）でAUとVST3として動作します。どのDAWをお使いですか？"
    },
    technical: {
      keywords: ['システム要件', '仕様', '互換性', 'ブラウザ', 'デバイス', 'パフォーマンス'],
      response: "プラグインはAUとVST3で、Mac/Windowsの主要DAWに対応しています。NNAudio AccessはmacOSとWindowsで動作します。各製品ページで要件を確認してください。"
    }
  },
  it: {
    smalltalk: {
      keywords: ['come stai', 'come va', 'ciao', 'eh', 'che novità'],
      response: "Sto benissimo e sono pronto ad aiutarti con la tua musica. Ti stai concentrando su progressioni di accordi, melodie o arrangiamento di una canzone completa ?"
    },
    pricing: {
      keywords: ['prezzo', 'costo', 'prezzi', 'abbonamento', 'piano', 'gratis', 'prova', 'denaro'],
      response: "NNAudio offre plugin, pack e bundle (acquisto singolo o abbonamento). Prezzi su nnaud.io. Serve aiuto per scegliere?"
    },
    features: {
      keywords: ['caratteristica', 'strumento', 'sintetizzatore', 'batteria', 'strumento', 'effetto', 'cosa puoi', 'capacità'],
      response: "NNAudio vende plugin (AU/VST3), pack di sample e MIDI. Usa NNAudio Access per scaricare e installare tutto. Cerchi plugin, pack o bundle?"
    },
    getting_started: {
      keywords: ['iniziare', 'cominciare', 'come', 'tutorial', 'imparare', 'nuovo utente', 'prima volta'],
      response: "Scarica NNAudio Access dalla pagina prodotto, installalo e accedi con il tuo account nnaud.io. I tuoi prodotti appariranno per il download. Puoi anche usare I miei prodotti nella dashboard sul sito."
    },
    support: {
      keywords: ['aiuto', 'supporto', 'problema', 'problema', 'bug', 'contatto', 'servizio clienti'],
      response: "Accedi e vai in Supporto per creare un ticket, oppure scrivi a support@nnaud.io. Descrivi il problema (prodotto mancante, download, NNAudio Access) e ti aiuteremo."
    },
    comparison: {
      keywords: ['vs', 'confrontare', 'migliore di', 'alternativa', 'concorrente', 'fl studio', 'ableton', 'logic'],
      response: "I plugin NNAudio funzionano nei DAW principali (Logic, Ableton, FL Studio, Cubase ecc.) come AU e VST3. Quale DAW usi?"
    },
    technical: {
      keywords: ['requisiti di sistema', 'specifiche', 'compatibile', 'browser', 'dispositivo', 'prestazioni'],
      response: "I nostri plugin sono AU e VST3 e funzionano con i principali DAW su Mac e Windows. NNAudio Access funziona su macOS e Windows. Controlla ogni pagina prodotto per i requisiti."
    }
  },
  tr: {
    smalltalk: {
      keywords: ['nasılsın', 'nasıl gidiyor', 'merhaba', 'hey', 'naber'],
      response: "Çok iyiyim ve müziğinle ilgili yardımcı olmaya hazırım. Akor ilerlemeleri, melodi mi yoksa tam bir şarkı düzenlemesi mi üzerine odaklanıyorsunuz ?"
    },
    pricing: {
      keywords: ['fiyat', 'maliyet', 'fiyatlandırma', 'abonelik', 'plan', 'ücretsiz', 'deneme', 'para'],
      response: "NNAudio eklentiler, paketler ve paketler sunar (tek seferlik veya abonelik). Fiyatlar için nnaud.io'ya bakın. Seçim için yardım ister misiniz?"
    },
    features: {
      keywords: ['özellik', 'araç', 'sentezleyici', 'davul', 'enstrüman', 'efekt', 'yapabilir', 'yetenekler'],
      response: "NNAudio eklentiler (AU/VST3), örnek paketleri ve MIDI satar. İndirme ve kurulum için NNAudio Access kullanın. Eklenti, paket mi yoksa paket mi arıyorsunuz?"
    },
    getting_started: {
      keywords: ['başla', 'başlat', 'nasıl', 'öğretici', 'öğren', 'yeni kullanıcı', 'ilk kez'],
      response: "NNAudio Access'i ürün sayfasından indirin, kurun ve nnaud.io hesabınızla giriş yapın. Ürünleriniz indirme ve kurulum için görünecek. Sitede panelde Ürünlerim'e de bakabilirsiniz."
    },
    support: {
      keywords: ['yardım', 'destek', 'sorun', 'sorun', 'hata', 'iletişim', 'müşteri hizmeti'],
      response: "Giriş yapıp Destek'te bilet oluşturun veya support@nnaud.io'ya yazın. Sorununuzu (eksik ürün, indirme, NNAudio Access) açıklayın, yardımcı olalım."
    },
    comparison: {
      keywords: ['vs', 'karşılaştır', 'daha iyi', 'alternatif', 'rakip', 'fl studio', 'ableton', 'logic'],
      response: "NNAudio eklentileri başlıca DAW'larda (Logic, Ableton, FL Studio, Cubase vb.) AU ve VST3 olarak çalışır. Hangi DAW'ı kullanıyorsunuz?"
    },
    technical: {
      keywords: ['sistem gereksinimleri', 'özellikler', 'uyumlu', 'tarayıcı', 'cihaz', 'performans'],
      response: "Eklentilerimiz AU ve VST3'tür; Mac ve Windows'ta başlıca DAW'larla uyumludur. NNAudio Access macOS ve Windows'ta çalışır. Gereksinimler için her ürün sayfasına bakın."
    }
  },
  zh: {
    smalltalk: {
      keywords: ['你好', '怎么样', '怎么了', '嗨', '你呢'],
      response: "我很好,准备好帮助您的音乐了。您是在专注于和弦进行、旋律还是编排完整的歌曲 ?"
    },
    pricing: {
      keywords: ['价格', '成本', '定价', '订阅', '计划', '免费', '试用', '钱'],
      response: "NNAudio 提供插件、音色包和套装（一次性购买或订阅）。请访问 nnaud.io 查看价格。需要帮助选择吗？"
    },
    features: {
      keywords: ['功能', '工具', '合成器', '鼓', '乐器', '效果', '能做什么', '能力'],
      response: "NNAudio 销售插件（AU/VST3）、采样包和 MIDI。使用 NNAudio Access 下载和安装所有内容。您需要插件、包还是套装？"
    },
    getting_started: {
      keywords: ['开始', '开始', '如何', '教程', '学习', '新用户', '第一次'],
      response: "从产品页下载 NNAudio Access，安装后用您的 nnaud.io 账户登录。您的产品将显示供下载和安装。您也可以在网站仪表板的「我的产品」中查看。"
    },
    support: {
      keywords: ['帮助', '支持', '问题', '问题', '错误', '联系', '客户服务'],
      response: "请登录并在「支持」中创建工单，或发送邮件至 support@nnaud.io。描述您的问题（如缺少产品、下载、NNAudio Access），我们会协助您。"
    },
    comparison: {
      keywords: ['vs', '比较', '比...更好', '替代方案', '竞争对手', 'fl studio', 'ableton', 'logic'],
      response: "NNAudio 插件在主流 DAW（Logic、Ableton、FL Studio、Cubase 等）中以 AU 和 VST3 运行。您使用哪个 DAW？"
    },
    technical: {
      keywords: ['系统要求', '规格', '兼容', '浏览器', '设备', '性能'],
      response: "我们的插件为 AU 和 VST3，支持 Mac 和 Windows 上的主流 DAW。NNAudio Access 支持 macOS 和 Windows。具体需求请查看各产品页面。"
    }
  }
};

const SALES_RESPONSES: Record<string, Record<string, { keywords: string[], response: string }>> = {
  en: {
    trial: {
      keywords: ['trial', 'test', 'try', 'demo', 'sample'],
      response: "For product demos or trials, check the individual product pages on nnaud.io. What are you hoping to try?"
    },
    upgrade: {
      keywords: ['upgrade', 'premium', 'pro', 'studio', 'paid'],
      response: "For bundles and premium options, visit the Bundles and Products pages on nnaud.io. What are you most interested in?"
    },
    pricing_concerns: {
      keywords: ['expensive', 'cheap', 'worth', 'value', 'affordable'],
      response: "Pricing varies by product and bundle; many items are one-time purchase. Check nnaud.io for current prices and bundle deals. What's your budget range?"
    }
  },
  es: {
    trial: {
      keywords: ['prueba', 'probar', 'prueba', 'demostración', 'muestra'],
      response: "Para obtener más información sobre opciones de prueba, consulte el nnaud.io. ¿Qué esperas probar ?"
    },
    upgrade: {
      keywords: ['actualizar', 'premium', 'pro', 'estudio', 'pagado'],
      response: "Para opciones de actualización y funciones premium, visite la sección de precios en el nnaud.io. ¿Cuáles son las características que más te interesan ?"
    },
    pricing_concerns: {
      keywords: ['caro', 'barato', 'vale la pena', 'valor', 'asequible'],
      response: "Para información detallada sobre precios y valor, consulte la sección de precios en el nnaud.io. ¿Cuál es tu rango de presupuesto ?"
    }
  },
  fr: {
    trial: {
      keywords: ['essai', 'tester', 'essayer', 'démo', 'exemple'],
      response: "Pour en savoir plus sur les options d'essai, veuillez consulter le nnaud.io. Que voulez-vous tester ?"
    },
    upgrade: {
      keywords: ['mise à niveau', 'premium', 'pro', 'studio', 'payant'],
      response: "Pour les options de mise à niveau et les fonctionnalités premium, veuillez consulter la section tarifaire du nnaud.io. Quelles fonctionnalités vous intéressent le plus ?"
    },
    pricing_concerns: {
      keywords: ['cher', 'pas cher', 'ça en va la peine', 'valeur', 'abordable'],
      response: "Pour des informations détaillées sur les tarifs et la valeur, veuillez consulter la section tarifaire du nnaud.io. Quel est votre gamme budgétaire ?"
    }
  },
  de: {
    trial: {
      keywords: ['versuch', 'testen', 'ausprobieren', 'demo', 'probe'],
      response: "Informationen zu Testoptionen finden Sie auf der nnaud.io. Was möchtest du testen ?"
    },
    upgrade: {
      keywords: ['update', 'premium', 'pro', 'studio', 'bezahlt'],
      response: "Weitere Informationen zu Upgrade-Optionen und Premium-Funktionen finden Sie im Bereich Preise auf der nnaud.io. Welche Funktionen interessieren dich am meisten ?"
    },
    pricing_concerns: {
      keywords: ['teuer', 'billig', 'wert', 'wert', 'erschwinglich'],
      response: "Detaillierte Informationen zu Preisen und Wert finden Sie im Bereich Preise auf der nnaud.io. Was ist dein Budgetbereich ?"
    }
  },
  pt: {
    trial: {
      keywords: ['teste', 'testar', 'tentar', 'demonstração', 'amostra'],
      response: "Para saber mais sobre as opções de teste, visite o nnaud.io. O que você espera testar ?"
    },
    upgrade: {
      keywords: ['atualizar', 'premium', 'pro', 'estúdio', 'pago'],
      response: "Para opções de atualização e recursos premium, visite a seção de preços no nnaud.io. Quais recursos mais te interessam ?"
    },
    pricing_concerns: {
      keywords: ['caro', 'barato', 'vale a pena', 'valor', 'acessível'],
      response: "Para informações detalhadas sobre preços e valor, visite a seção de preços no nnaud.io. Qual é o seu faixa de orçamento ?"
    }
  },
  ja: {
    trial: {
      keywords: ['試用', 'テスト', 'ためす', 'デモ', 'サンプル'],
      response: "試用オプションについて詳しくは、nnaud.ioをご覧ください。何をテストしたいですか ?"
    },
    upgrade: {
      keywords: ['アップグレード', 'プレミアム', 'プロ', 'スタジオ', '有料'],
      response: "アップグレード オプションとプレミアム機能については、nnaud.ioの料金セクションをご覧ください。どの機能に最も興味がありますか ?"
    },
    pricing_concerns: {
      keywords: ['高い', '安い', '価値がある', '価値', '手頃'],
      response: "詳細な価格と価値の情報については、nnaud.ioの料金セクションをご覧ください。予算の範囲は ?"
    }
  },
  it: {
    trial: {
      keywords: ['prova', 'provare', 'test', 'demo', 'campione'],
      response: "Per ulteriori informazioni sulle opzioni di prova, consulta il nnaud.io. Cosa speriamo di testare ?"
    },
    upgrade: {
      keywords: ['aggiornamento', 'premium', 'pro', 'studio', 'pagato'],
      response: "Per le opzioni di aggiornamento e le funzioni premium, consulta la sezione Prezzi nel nnaud.io. Quali funzioni ti interessano di più ?"
    },
    pricing_concerns: {
      keywords: ['costoso', 'economico', 'ne vale la pena', 'valore', 'conveniente'],
      response: "Per informazioni dettagliate su prezzi e valore, consulta la sezione Prezzi nel nnaud.io. Qual è il tuo intervallo di budget ?"
    }
  },
  tr: {
    trial: {
      keywords: ['deneme', 'denemek', 'test', 'demo', 'örnek'],
      response: "Deneme seçenekleri hakkında bilgi almak için lütfen nnaud.io ziyaret edin. Ne test etmeyi umuyorsunuz ?"
    },
    upgrade: {
      keywords: ['yükseltme', 'premium', 'pro', 'stüdyo', 'ücretli'],
      response: "Yükseltme seçenekleri ve premium özellikler için lütfen nnaud.io fiyatlandırma bölümünü ziyaret edin. Hangi özellikler sizi en fazla ilgilendiriyor ?"
    },
    pricing_concerns: {
      keywords: ['pahalı', 'ucuz', 'değer', 'değer', 'uygun fiyatlı'],
      response: "Fiyatlandırma ve değer hakkında ayrıntılı bilgi için lütfen nnaud.io fiyatlandırma bölümünü ziyaret edin. Bütçe aralığınız nedir ?"
    }
  },
  zh: {
    trial: {
      keywords: ['试用', '测试', '尝试', '演示', '样本'],
      response: "要了解有关试用选项的信息，请访问 nnaud.io。您希望测试什么 ?"
    },
    upgrade: {
      keywords: ['升级', '高级版', '专业版', '工作室', '付费'],
      response: "有关升级选项和高级功能，请访问 nnaud.io上的定价部分。您对哪些功能最感兴趣 ?"
    },
    pricing_concerns: {
      keywords: ['昂贵', '便宜', '值得', '价值', '实惠'],
      response: "有关详细的定价和价值信息，请访问 nnaud.io上的定价部分。您的预算范围是多少 ?"
    }
  }
};

function detectIntent(message: string, language: string = 'en'): string | null {
  const lowerMessage = message.toLowerCase();
  const faqResponses = FAQ_RESPONSES[language] || FAQ_RESPONSES['en'];
  const salesResponses = SALES_RESPONSES[language] || SALES_RESPONSES['en'];
  
  // Check for sales intents first
  for (const [intent, data] of Object.entries(salesResponses)) {
    if (data.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return intent;
    }
  }
  
  // Then check FAQ intents
  for (const [intent, data] of Object.entries(faqResponses)) {
    if (data.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return intent;
    }
  }
  
  return null;
}

async function generateAIResponse(message: string, conversationHistory: ChatMessage[], language: string = 'en'): Promise<string> {
  // Check if OpenAI is available
  if (!openai) {
    console.log('OpenAI API key not configured, using fallback responses');
    return generateFallbackResponse(message, language);
  }

  try {
    // Layer 1: RAG - Retrieve relevant context from knowledge base
    const context = await cymasphereRAG.retrieveRelevantContext(message);
    
    // Layer 2: Generate response with retrieved context
    const response = await cymasphereRAG.generateResponse(message, conversationHistory);
    
    // Layer 3: Verification - Fact-check the response against context
    const isVerified = await cymasphereRAG.verifyResponse(response, context);
    
    if (!isVerified) {
      console.log('Response failed verification, using fallback');
      return generateFallbackResponse(message, language);
    }
    
    return response;
  } catch (error) {
    console.error('RAG system error:', error);
    // Fallback to keyword-based responses if RAG fails
    return generateFallbackResponse(message, language);
  }
}

function generateFallbackResponse(message: string, language: string = 'en'): string {
  const intent = detectIntent(message, language);
  const faqResponses = FAQ_RESPONSES[language] || FAQ_RESPONSES['en'];
  const salesResponses = SALES_RESPONSES[language] || SALES_RESPONSES['en'];
  
  if (intent && salesResponses[intent as keyof typeof salesResponses]) {
    return salesResponses[intent as keyof typeof salesResponses].response;
  }
  
  if (intent && faqResponses[intent as keyof typeof faqResponses]) {
    return faqResponses[intent as keyof typeof faqResponses].response;
  }
  
  // Default responses for common questions
  const defaults: Record<string, Record<string, string>> = {
    en: {
      hello: "Hello! I'm here to help with NNAudio products, downloads, NNAudio Access, or your account. What do you need—plugins, bundles, or help with an order?",
      what: "I'm here to help with NNAudio—plugins, packs, bundles, downloads, and NNAudio Access. What are you looking for?",
      thanks: "You're welcome! Is there anything else I can help you with today?",
      bye: "Thanks for chatting! Feel free to come back anytime if you have more questions.",
      struggles: "I'm sorry you're running into issues. Log in and create a support ticket with the details, or email support@nnaud.io. We can help with missing products, NNAudio Access, or installation problems.",
      stuck: "If you're stuck with downloads or installation, use NNAudio Access (download from the product page) and log in with your nnaud.io account—your products will appear there. For other issues, create a support ticket or email support@nnaud.io.",
      theory: "NNAudio sells plugins, sample packs, and MIDI. Use NNAudio Access to download and install everything. Need help finding a product or logging in?",
      general: "I'm here to help with NNAudio products, bundles, NNAudio Access, and your account. Check the FAQ on the site or create a support ticket for specific questions. What do you need?"
    },
    es: {
      hello: "¡Hola! Estoy aquí para ayudarte con productos NNAudio, descargas, NNAudio Access o tu cuenta. ¿Qué necesitas: plugins, bundles o ayuda con un pedido?",
      what: "Estoy aquí para ayudar con NNAudio: plugins, packs, bundles, descargas y NNAudio Access. ¿Qué buscas?",
      thanks: "¡De nada! ¿Hay algo más en lo que pueda ayudarte hoy?",
      bye: "¡Gracias por chatear! Siéntete libre de volver cuando quieras si tienes más preguntas.",
      struggles: "Lamentamos que tengas problemas. Inicia sesión y crea un ticket de soporte con los detalles, o escribe a support@nnaud.io. Podemos ayudarte con productos faltantes, NNAudio Access o instalación.",
      stuck: "Si tienes problemas con descargas o instalación, usa NNAudio Access (descárgalo desde la página del producto) e inicia sesión con tu cuenta nnaud.io; tus productos aparecerán ahí. Para otros temas, crea un ticket de soporte o escribe a support@nnaud.io.",
      theory: "NNAudio vende plugins, packs de samples y MIDI. Usa NNAudio Access para descargar e instalar todo. ¿Necesitas ayuda para encontrar un producto o iniciar sesión?",
      general: "Estoy aquí para ayudar con productos NNAudio, bundles, NNAudio Access y tu cuenta. Revisa la FAQ en el sitio o crea un ticket de soporte para preguntas concretas. ¿Qué necesitas?"
    },
    // Add more languages as needed, or fall back to English
  };
  
  const langDefaults = defaults[language] || defaults['en'];
  
  if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    return langDefaults.hello;
  }
  
  const trimmed = message.trim().toLowerCase();
  if (trimmed === 'what' || trimmed === 'what?') {
    return langDefaults.what;
  }
  
  if (message.toLowerCase().includes('thank')) {
    return langDefaults.thanks;
  }
  
  if (message.toLowerCase().includes('bye') || message.toLowerCase().includes('goodbye')) {
    return langDefaults.bye;
  }
  
  if (message.toLowerCase().includes('sucks') || 
      message.toLowerCase().includes('terrible') || 
      message.toLowerCase().includes('bad at music') ||
      message.toLowerCase().includes('not good') ||
      message.toLowerCase().includes('awful')) {
    return langDefaults.struggles;
  }

  if (message.toLowerCase().includes('stuck') || 
      message.toLowerCase().includes('rut') ||
      message.toLowerCase().includes('blocked') ||
      message.toLowerCase().includes('can\'t create')) {
    return langDefaults.stuck;
  }

  if (message.toLowerCase().includes('theory') && 
      (message.toLowerCase().includes('don\'t know') || 
       message.toLowerCase().includes('confused') ||
       message.toLowerCase().includes('hard'))) {
    return langDefaults.theory;
  }

  return langDefaults.general;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationHistory, language } = body;
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Use provided language or default to English
    const chatLanguage = language || 'en';
    console.log(`[chat-api] Processing message in language: ${chatLanguage}`);
    
    // Generate AI response
    const response = await generateAIResponse(message, conversationHistory, chatLanguage);
    
    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
      language: chatLanguage
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
