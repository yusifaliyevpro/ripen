import { SiNpm } from "react-icons/si";
import { VscGithubInverted } from "react-icons/vsc";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-text-dim">
          Built by{" "}
          <a
            href="https://yusifaliyevpro.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-orange transition-colors"
          >
            Yusif Aliyev
          </a>
        </p>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/yusifaliyevpro/ripen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-dim hover:text-orange transition-colors"
          >
            <VscGithubInverted className="w-5 h-5" />
          </a>
          <a
            href="https://www.npmjs.com/package/ripencli"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-dim hover:text-orange transition-colors"
          >
            <SiNpm className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
