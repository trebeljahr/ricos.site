import axios from "axios";
import { JSDOM } from "jsdom";
import fs from "fs/promises";

const links = [
  "https://www.youtube.com/watch?v=e3K5UxWRRuY",
  "https://www.youtube.com/watch?v=T647CGsuOVU",
  "https://www.youtube.com/watch?v=d4c87NfCQ74",
  "https://www.youtube.com/watch?v=jey_CzIOfYE",
  "https://www.youtube.com/watch?v=GEf6X-FueMo",
  "https://www.youtube.com/watch?v=PqpYxD71hJU",
  "https://www.youtube.com/watch?v=aALsFhZKg-Q",
  "https://www.youtube.com/watch?v=t0-Y3OHo7fg",
  "https://www.youtube.com/watch?v=gB9n2gHsHN4",
  "https://www.youtube.com/watch?v=spUNpyF58BY&t=4s",
  "https://www.youtube.com/watch?v=2SUvWfNJSsM",
  "https://www.youtube.com/watch?v=bdMfjfT0lKk",
  "https://www.youtube.com/watch?v=Xc4xYacTu-E&t=247s",
  "https://www.youtube.com/watch?v=s86-Z-CbaHA&t=7s",
  "https://www.youtube.com/watch?v=fCn8zs912OE",
  "https://www.youtube.com/watch?v=yNLdblFQqsw",
  "https://www.youtube.com/watch?v=i2wLyhgeYsw",
  "https://www.youtube.com/watch?v=vsMydMDi3rI",
  "https://www.youtube.com/watch?v=PHe0bXAIuk0&t=1s",
  "https://www.youtube.com/watch?v=4UFKl9fULkA",
  "https://www.youtube.com/watch?v=sLFaa6RPJIU",
  "https://www.youtube.com/watch?v=Cyu7etM-0Ko",
  "https://www.youtube.com/watch?v=s_usIkrVQwE&t=24s",
  "https://www.youtube.com/watch?v=J3FcbFqSoQY",
  "https://www.youtube.com/watch?v=HeQX2HjkcNo",
  "https://www.youtube.com/watch?v=ovJcsL7vyrk",
  "https://www.youtube.com/watch?v=X_tYrnv_o6A",
  "https://www.youtube.com/watch?v=S1tFT4smd6E",
  "https://www.youtube.com/watch?v=qnOoDE9rj6w",
  "https://www.youtube.com/watch?v=97t7Xj_iBv0",
  "https://www.youtube.com/watch?v=WIyTZDHuarQ",
  "https://www.youtube.com/watch?v=LS3GQk9ETRU",
  "https://www.youtube.com/watch?v=OI_HFnNTfyU",
  "https://www.youtube.com/watch?v=jVYs-GTqm5U",
  "https://www.youtube.com/watch?v=Ms65JBrevYU",
  "https://www.youtube.com/watch?v=MUiYglgGbos",
  "https://www.youtube.com/watch?v=ds0cmAV-Yek",
  "https://www.youtube.com/watch?v=_fTC_Ud_k3U&t=593s",
  "https://www.youtube.com/watch?v=LE2v3sUzTH4",
  "https://www.youtube.com/watch?v=1PGm8LslEb4",
  "https://www.youtube.com/playlist?list=PLE18841CABEA24090",
  "https://www.youtube.com/watch?v=8--5LwHRhjk",
  "https://www.youtube.com/playlist?list=PL44ABC9278E2EE706",
  "https://www.youtube.com/watch?v=rStL7niR7gs&t=3s",
  "https://www.youtube.com/watch?v=I0-izyq6q5s",
  "https://www.youtube.com/watch?v=a_HfSnQqeyY&t=1803s",
  "https://www.youtube.com/watch?v=L5E4NiP4hpM",
  "https://www.youtube.com/watch?v=hBpetDxIEMU&t=1236s",
  "https://www.youtube.com/watch?v=-9uRdBWnspY",
  "https://www.youtube.com/watch?v=f_R-217N_qg&t=150s",
  "https://www.youtube.com/watch?v=szikg74kgnM",
  "https://www.youtube.com/watch?v=6avJHaC3C2U&t=4s",
  "https://www.youtube.com/watch?v=n068fel-W9I",
  "https://www.youtube.com/watch?v=O8i7OKbWmRM",
  "https://www.youtube.com/watch?v=Qj1FK8n7WgY",
  "https://www.youtube.com/watch?v=7Pq-S557XQU&t=12s",
  "https://www.youtube.com/watch?v=qoDZKlcdPNM",
  "https://www.youtube.com/watch?v=aOSD9rTVuWc&t=19s",
  "https://www.youtube.com/watch?v=BUTHtNrpwiI&t=103s",
  "https://www.youtube.com/watch?v=T0fAznO1wA8",
  "https://www.youtube.com/watch?v=R9OHn5ZF4Uo",
  "https://www.youtube.com/watch?v=LO1mTELoj6o&t=365s",
  "https://www.youtube.com/watch?v=3YFeE1eDlD0",
  "https://www.youtube.com/watch?v=whPWKecazgM&t=1s",
  "https://www.youtube.com/watch?v=gNRnrn5DE58",
  "https://www.youtube.com/watch?v=BNYJQaZUDrI&list=PL8dPuuaLjXtNgK6MZucdYldNkMybYIHKR",
  "https://www.youtube.com/watch?v=jSOU-J9KHbg",
  "https://www.youtube.com/watch?v=Unzc731iCUY",
  "https://www.youtube.com/watch?v=54XLXg4fYsc",
  "https://www.youtube.com/watch?v=NJW3KfjM2aw",
  "https://www.youtube.com/watch?v=4eRCygdW--c",
  "https://www.youtube.com/watch?v=vtIzMaLkCaM",
  "https://www.youtube.com/watch?v=f84n5oFoZBc",
  "https://www.youtube.com/watch?v=-6BsiVyC1kM",
  "https://www.youtube.com/watch?v=YR5WdGrpoug",
  "https://www.youtube.com/watch?v=bVQUSndDllU",
  "https://www.youtube.com/watch?v=Cp5WWtMoeKg",
  "https://www.youtube.com/watch?v=M3iI2l0ltbE&t=5s",
  "https://www.youtube.com/watch?v=bqtqltqcQhw&t=1s",
  "https://www.youtube.com/watch?v=Vz9BDIwvmTg&t=120s",
  "https://www.youtube.com/watch?v=RS7gyZJg5nc",
  "https://www.youtube.com/watch?v=f5liqUk0ZTw",
  "https://www.youtube.com/watch?v=X3rl5O_92Co",
  "https://www.youtube.com/watch?v=vmIUvp0e1bw",
  "https://www.youtube.com/watch?v=xRel1JKOEbI",
  "https://www.youtube.com/watch?v=8aGhZQkoFbQ",
  "https://www.youtube.com/watch?v=WXuK6gekU1Y",
  "https://www.youtube.com/watch?v=xuCn8ux2gbs&t=1s",
  "https://www.youtube.com/watch?v=zVhQOhxb1Mc",
  "https://www.youtube.com/watch?v=MnW7DxsJth0",
  "https://www.youtube.com/watch?v=86xWVb4XIyE",
  "https://www.youtube.com/watch?v=oJTwQvgfgMM&t=2199s",
  "https://www.youtube.com/watch?v=Uz_0i27wYbg",
  "https://www.youtube.com/watch?v=JWD1Fpdd4Pc",
  "https://www.youtube.com/watch?v=wlR5gYd6um0",
  "https://www.youtube.com/watch?v=snAhsXyO3Ck",
  "https://www.youtube.com/watch?v=Vs5j0CLPHlI",
  "https://www.youtube.com/watch?v=J63mKverb8w",
  "https://www.youtube.com/watch?v=K5nJ5l6dl2s",
  "https://www.youtube.com/watch?v=WRdJCFEqFTU",
  "https://www.youtube.com/watch?v=d0gUFn2OrvM",
  "https://www.youtube.com/watch?v=MCZ3YgeEUPg&t=1004s",
  "https://www.youtube.com/watch?v=oyLBGkS5ICk&t=1487s",
  "https://www.youtube.com/watch?v=YR5WdGrpoug",
  "https://www.youtube.com/watch?v=2V1FtfBDsLU",
  "https://www.youtube.com/watch?v=dGVqrGmwOAw&t=1261s",
  "https://www.youtube.com/watch?v=kYYJlNbV1OM&list=PL22J3VaeABQApSdW8X71Ihe34eKN6XhCi",
  "https://www.youtube.com/watch?v=XzSWWJuSb9M",
];

async function getTitle(link) {
  const res = await axios.get(link);
  const html = await res.data;
  const dom = new JSDOM(html);
  return dom.window.document.title;
}

const titles = [];

for (const link of links) {
  titles.push(await getTitle(link));
  console.log("Success");
}

function combineTitleAndLink(title, link) {
  return `[${title}](${link})`;
}

console.log(titles);

const output = titles.map((title, i) => {
  const link = links[i];
  return combineTitleAndLink(title, link);
});

console.log(output);

fs.writeFile("youtube-titles-with-links.md", output.join("\n"));
