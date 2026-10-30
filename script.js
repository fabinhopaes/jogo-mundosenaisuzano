const botoesCor = [...document.querySelectorAll(".pad")];
const botaoCentro = document.querySelector("#hub-start");
const botaoSom = document.querySelector("#sound-toggle");
const etiquetaSom = document.querySelector("#sound-label");
const botaoTema = document.querySelector("#theme-toggle");
const etiquetaTema = document.querySelector("#theme-label");
const seletorDificuldade = document.querySelector("#difficulty-select");
const valorRodada = document.querySelector("#round-value");
const valorRecorde = document.querySelector("#best-value");
const estado = document.querySelector("#status");
const mensagem = document.querySelector("#game-message");
const metaTema = document.querySelector('meta[name="theme-color"]');

const perfisDeSom = [
	{ frequencia: 392, forma: "sawtooth" },
	{ frequencia: 523.25, forma: "triangle" },
	{ frequencia: 659.25, forma: "sine" },
	{ frequencia: 783.99, forma: "square" },
];
const dificuldades = {
	facil: { intervaloInicial: 920, aceleracao: 28, limite: 420 },
	medio: { intervaloInicial: 720, aceleracao: 38, limite: 300 },
	dificil: { intervaloInicial: 560, aceleracao: 45, limite: 240 },
};

let sequencia = [];
let indiceJogador = 0;
let emReproducao = false;
let jogoAtivo = false;
let somAtivo = true;
let contextoAudio;
let melhorPontuacao = lerRecorde();

valorRecorde.textContent = String(melhorPontuacao).padStart(2, "0");

function lerRecorde() {
	try {
		return Math.max(0, Number(localStorage.getItem("mundo-senai-recorde") || 0));
	} catch {
		return 0;
	}
}

function salvarRecorde() {
	try {
		localStorage.setItem("mundo-senai-recorde", String(melhorPontuacao));
	} catch {
		// A partida continua normalmente se o navegador bloquear o armazenamento.
	}
}

// Libera cada controle somente quando o estado da partida permite.
function atualizarControles() {
	const podeResponder = jogoAtivo && !emReproducao;
	botoesCor.forEach((botao) => {
		botao.disabled = !podeResponder;
	});
	seletorDificuldade.disabled = jogoAtivo;
	botaoCentro.disabled = jogoAtivo;
}

function atualizarPlacar() {
	valorRodada.textContent = String(sequencia.length).padStart(2, "0");
}

// Cada cor usa frequência e forma de onda próprias para facilitar a distinção.
function emitirTom(frequencia, forma, duracao = 260, atraso = 0, volumeMaximo = 0.18) {
	const AudioContext = window.AudioContext || window.webkitAudioContext;
	if (!AudioContext) return;

	contextoAudio ??= new AudioContext();
	if (contextoAudio.state === "suspended") contextoAudio.resume();

	const inicio = contextoAudio.currentTime + atraso;
	const oscilador = contextoAudio.createOscillator();
	const volume = contextoAudio.createGain();
	oscilador.type = forma;
	oscilador.frequency.setValueAtTime(frequencia, inicio);
	volume.gain.setValueAtTime(0.0001, inicio);
	volume.gain.exponentialRampToValueAtTime(volumeMaximo, inicio + 0.025);
	volume.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao / 1000);
	oscilador.connect(volume);
	volume.connect(contextoAudio.destination);
	oscilador.start(inicio);
	oscilador.stop(inicio + duracao / 1000);
}

function tocarTom(indice, duracao = 300) {
	if (!somAtivo) return;
	const perfil = perfisDeSom[indice];
	emitirTom(perfil.frequencia, perfil.forma, duracao);
}

function tocarFeedback(tipo) {
	if (!somAtivo) return;
	if (tipo === "acerto") {
		emitirTom(523.25, "triangle", 180, 0, 0.14);
		emitirTom(659.25, "sine", 210, 0.11, 0.16);
		emitirTom(783.99, "triangle", 260, 0.22, 0.18);
		return;
	}
	emitirTom(220, "sawtooth", 260, 0, 0.2);
	emitirTom(164.81, "square", 360, 0.19, 0.16);
}

function acenderCor(indice, duracao = 300) {
	const botao = botoesCor[indice];
	botao.classList.add("is-lit");
	tocarTom(indice, duracao);
	window.setTimeout(() => botao.classList.remove("is-lit"), duracao);
}

function esperar(ms) {
	return new Promise((resolver) => window.setTimeout(resolver, ms));
}

async function mostrarSequencia() {
	emReproducao = true;
	atualizarControles();
	estado.textContent = "Observe";
	mensagem.className = "game__message";
	mensagem.textContent = "Memorize as cores que estão acendendo.";

	// Cada nível define a velocidade inicial e a aceleração por rodada.
	const nivel = dificuldades[seletorDificuldade.value];
	const intervalo = Math.max(nivel.limite, nivel.intervaloInicial - (sequencia.length - 1) * nivel.aceleracao);
	await esperar(550);

	for (const indice of sequencia) {
		acenderCor(indice, Math.min(320, intervalo - 100));
		await esperar(intervalo);
	}

	emReproducao = false;
	indiceJogador = 0;
	atualizarControles();
	estado.textContent = "Sua vez";
	mensagem.textContent = "Agora repita a sequência na mesma ordem.";
}

function iniciarRodada() {
	sequencia.push(Math.floor(Math.random() * botoesCor.length));
	atualizarPlacar();
	mostrarSequencia();
}

function encerrarJogo() {
	jogoAtivo = false;
	emReproducao = false;
	atualizarControles();
	estado.textContent = "Fim de jogo";
	mensagem.className = "game__message is-error";
	mensagem.textContent = `Não foi dessa vez. Você concluiu ${Math.max(0, sequencia.length - 1)} rodadas.`;
	botaoCentro.textContent = "REINICIAR";
	botaoCentro.dataset.state = "restart";
	botaoCentro.setAttribute("aria-label", "Reiniciar jogo");
	tocarFeedback("erro");
}

function responder(indice) {
	if (!jogoAtivo || emReproducao) return;

	acenderCor(indice, 220);
	if (sequencia[indiceJogador] !== indice) {
		encerrarJogo();
		return;
	}

	indiceJogador += 1;
	if (indiceJogador === sequencia.length) {
		atualizarControles();
		estado.textContent = "Correto!";
		mensagem.className = "game__message is-success";
		mensagem.textContent = "Boa! A próxima sequência está chegando.";
		tocarFeedback("acerto");

		if (sequencia.length > melhorPontuacao) {
			melhorPontuacao = sequencia.length;
			valorRecorde.textContent = String(melhorPontuacao).padStart(2, "0");
			salvarRecorde();
		}

		window.setTimeout(iniciarRodada, 850);
	}
}

function iniciarJogo() {
	if (jogoAtivo || emReproducao) return;
	sequencia = [];
	indiceJogador = 0;
	jogoAtivo = true;
	botaoCentro.textContent = "MS";
	botaoCentro.dataset.state = "playing";
	botaoCentro.setAttribute("aria-label", "Jogo em andamento");
	iniciarRodada();
}

function alternarTema() {
	const temaEscuro = document.documentElement.dataset.theme !== "dark";
	document.documentElement.dataset.theme = temaEscuro ? "dark" : "light";
	botaoTema.setAttribute("aria-pressed", String(temaEscuro));
	botaoTema.setAttribute("aria-label", temaEscuro ? "Ativar tema claro" : "Ativar tema escuro");
	etiquetaTema.textContent = temaEscuro ? "Tema claro" : "Tema escuro";
	metaTema.content = temaEscuro ? "#20232a" : "#f5f6f8";
	try {
		localStorage.setItem("mundo-senai-tema", temaEscuro ? "dark" : "light");
	} catch {
		// A alternância funciona mesmo sem persistência entre visitas.
	}
}

function carregarTema() {
	let temaSalvo = "light";
	try {
		temaSalvo = localStorage.getItem("mundo-senai-tema") || "light";
	} catch {
		// O tema claro é o padrão quando o armazenamento não está disponível.
	}
	const temaEscuro = temaSalvo === "dark";
	document.documentElement.dataset.theme = temaEscuro ? "dark" : "light";
	botaoTema.setAttribute("aria-pressed", String(temaEscuro));
	botaoTema.setAttribute("aria-label", temaEscuro ? "Ativar tema claro" : "Ativar tema escuro");
	etiquetaTema.textContent = temaEscuro ? "Tema claro" : "Tema escuro";
	metaTema.content = temaEscuro ? "#20232a" : "#f5f6f8";
}

botoesCor.forEach((botao) => {
	botao.addEventListener("click", () => responder(Number(botao.dataset.color)));
});

document.addEventListener("keydown", (evento) => {
	if (evento.altKey || evento.ctrlKey || evento.metaKey || evento.target.closest?.("select, input, textarea, button")) return;
	const tecla = Number(evento.key);
	if (tecla >= 1 && tecla <= 4) responder(tecla - 1);
});

botaoCentro.addEventListener("click", iniciarJogo);
botaoTema.addEventListener("click", alternarTema);
botaoSom.addEventListener("click", () => {
	somAtivo = !somAtivo;
	botaoSom.setAttribute("aria-pressed", String(somAtivo));
	botaoSom.setAttribute("aria-label", somAtivo ? "Desativar sons" : "Ativar sons");
	etiquetaSom.textContent = somAtivo ? "Som ligado" : "Som desligado";
});

atualizarControles();
carregarTema();
