import Image from "next/image";
import profile from "./rico.jpg";

export default function CVPage() {
  return (
    <div className="cv-container">
      <div className="cv-header">
        <Image
          className="cv-circular cv-image"
          src={profile}
          alt="profile picture of Rico Trebeljahr"
        />
        <div className="cv-name-heading">
          <h2 className="cv-black-heading">RICO</h2>
          <h2>TREBELJAHR</h2>
          <h2 className="cv-black-heading cv-job-title">SOFTWARE ENGINEER</h2>
        </div>
        <div className="cv-contact-info">
          <a href="mailto:ricotrebeljahr@gmail.com">ricotrebeljahr@gmail.com</a>
          <a href="https://github.com/trebeljahr">github.com/trebeljahr</a>
          <a href="https://www.linkedin.com/in/trebeljahr/">
            linkedin.com/in/trebeljahr/
          </a>
        </div>
      </div>
      <div className="cv-section">
        <h3>ABOUT ME</h3>
        <p>
          I am a self-taught software engineer and excellent problem solver, who
          loves to learn new things. My core strength is in the
          Typescript/Javascript ecosystem, but I am quite flexible with tech,
          having worked in Python and Golang environments as well.
        </p>
      </div>
      <div className="cv-section cv-main-section">
        <h2 className="cv-black-heading">WORK</h2>
        <div className="cv-divider" />
      </div>
      <div className="cv-section">
        <div>
          <h3>Ironhack</h3>
          <p className="cv-date">Jan. 2022 - now</p>
        </div>
        <p>
          Lead the teaching efforts of 3 cohorts at Ironhack, teaching 60+
          people how to become Fullstack Web Developers. Sharing my knowledge
          and expertise, and conducting both full-time and part time classes.
        </p>
      </div>
      <div className="cv-section">
        <div>
          <h3>ESA</h3>
          <p className="cv-date">Oct. 2021 - Dez. 2021</p>
        </div>
        <p>
          Worked on a project at the European Space Agency to build tools for
          avoiding collisions of satellites with space debris. Lead the efforts
          to automate deployments with Ansible.
        </p>
      </div>
      <div className="cv-section">
        <div>
          <h3>KLARNA</h3>
          <p className="cv-date">Jan. 2021 - Jul. 2021</p>
        </div>
        <p>
          Worked at Klarna for 6 months as a Software Engineer, as part of their
          core browser extension team. There I built an automated browser
          extension testing setup with cypress and wrote the extension&apos;s
          notifications feature.
        </p>
      </div>
      <div className="cv-section">
        <div>
          <h3>SOFTGAMES</h3>
          <p className="cv-date">Jun. 2021 - Apr. 2021</p>
        </div>
        <p>
          Worked at Softgames as a Junior Full Stack Developer. There I built an
          ultra flexible and scalable multiplayer server using Golang and a
          Typescript/RxJS client library to easily adapt to the frontend teams
          data requirements.
        </p>
      </div>

      <div className="cv-section cv-main-section">
        <h2 className="cv-black-heading">PERSONAL PROJECTS</h2>
        <div className="cv-divider" />
      </div>

      <div className="cv-section">
        <div>
          <h3>Quaternius 3D models</h3>
          <p className="cv-date">2023</p>
        </div>
        <p>
          Building a 3D viewer for 3D models provided by the talented artist
          Quaternius for free:{" "}
          <a href="https://quaternius.trebeljahr.com">
            quaternius.trebeljahr.com
          </a>
        </p>
      </div>

      <div className="cv-section">
        <div>
          <h3>Fractal Garden</h3>
          <p className="cv-date">2022</p>
        </div>
        <p>
          Building an open-source mathematical exhibition, filled with beautiful
          fractals. Making it to the hackernews frontpage.
          <a href="https://fractal.garden"> fractal.garden</a>
        </p>
      </div>

      <div className="cv-section">
        <div>
          <h3>MINECRAFT CLONE</h3>
          <p className="cv-date">2021</p>
        </div>
        <p>
          During this project I used ThreeJS to create a small demo clone of the
          popular game Minecraft. The twist is – this one runs as a webpage and
          in the browser:
          <a href="https://mc.ricotrebeljahr.com"> mc.ricotrebeljahr.com</a>
        </p>
      </div>

      {/* <div className="cv-section">
        <div>
          <h3>SELF LEARNING PHASE</h3>
          <p className="cv-date">2020</p>
        </div>
        <p>
          During the second half of 2020 I spent most of my days working through
          coursera courses on machine learning/Python and some DevOps... I
          finished a whole bunch of them, You can see the certificates
          <a href="https://www.linkedin.com/in/trebeljahr/"> on my LinkedIn.</a>
        </p>
      </div> */}

      <div className="cv-section">
        <div>
          <h3>PORTFOLIO PAGE</h3>
          <p className="cv-date">2020</p>
        </div>

        <p>
          In this project I gained a lot of experience building progressive web
          apps and utilizing server side rendering. The combined powers of
          Gatsby and Netlify let&apos;s me host it for free. You can check it
          out at
          <a href="https://ricotrebeljahr.com"> ricotrebeljahr.com</a>
        </p>
      </div>
      {/* <div className="cv-section">
        <div>
          <h3>CHESS APP</h3>
          <p className="cv-date">2019</p>
        </div>

        <p>
          In this app users are able to play chess against their friends. I
          built this full stack app using Meteor and React. It features user
          authentication, core chess game logic, a React view layer, game
          histories, matchmaking mechanics, move reversals, in game-chat and
          data persistence. You can play a round here:
          <a href="https://chess.ricotrebeljahr.de"> chess.ricotrebeljahr.de</a>
        </p>
      </div> */}

      <div className="cv-section cv-main-section">
        <h2 className="cv-black-heading">SKILLS</h2>
        <div className="cv-divider" />
      </div>
      <div className="cv-section">
        <h3>OVERVIEW</h3>
        <ul>
          <li>Full Stack Development</li>
          <li>JAM/MERN Stack</li>
          <li>Server Side Rendered Apps</li>
          <li>Progressive Web Apps</li>
          <li>Multiplayer Game Servers</li>
        </ul>
      </div>
      <div className="cv-section">
        <h3>TECH</h3>
        <ul>
          <li>JavaScript, HTML, CSS</li>
          <li>Golang, Python, TypeScript</li>
          <li>React.js, Next.js, Gatsby, Three.js, Pixi.js, p5.js</li>
          <li>Node.js, Express.js, Meteor.js</li>
          <li>DB/Query-Languages: MongoDB, GraphQl, SQL</li>
        </ul>
      </div>
    </div>
  );
}
