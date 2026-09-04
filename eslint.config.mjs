// Configuration ESLint unique du dépôt.
//
// Le mode `strictTypeChecked` de typescript-eslint est volontaire : il attrape
// ce que `tsc` laisse passer — promesses non attendues, comparaisons toujours
// vraies, `any` qui se propage. Sur une app qui manipule des rendez-vous, de
// l'argent et des données personnelles, ces erreurs-là coûtent cher.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.expo/**',
      '**/dist/**',
      'apps/pro/App.tsx',
      'apps/pro/index.ts', // gabarit Expo, remplacé plus tard
      '**/*.d.ts',
      // Le service worker : il tourne dans un contexte `ServiceWorkerGlobalScope`
      // que le projet TypeScript ne décrit pas, et il est servi tel quel depuis
      // `public/`. Le typer reviendrait à décrire une seconde plateforme pour un
      // seul fichier.
      'apps/web/public/sw.js',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Les composants React reçoivent des props sans les utiliser toutes ;
      // on tolère l'argument préfixé d'un tiret bas, pas la variable oubliée.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Une promesse non attendue dans une action serveur, c'est une écriture
      // qui part sans qu'on sache si elle a réussi.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // Le style de nommage n'est pas l'affaire du linter ici : le code est en
      // français, les règles anglo-saxonnes de casse n'ont pas de sens.
      '@typescript-eslint/naming-convention': 'off',
      // Le code du dépôt utilise `type` partout ; `interface` n'apporte rien
      // ici (pas de fusion de déclarations, pas d'API publique à étendre).
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // Interpoler un nombre dans un gabarit est courant et sans danger
      // (compteurs, durées, montants déjà formatés).
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  // Fichiers de configuration en JS : hors graphe TypeScript eux aussi.
  {
    files: ['**/*.config.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: { projectService: false, project: null },
      globals: { require: 'readonly', module: 'writable', __dirname: 'readonly' },
    },
    // Metro et PostCSS chargent leur configuration en CommonJS : `require`
    // y est la forme attendue, pas une négligence.
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      'no-undef': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Les fichiers de test : `test()` de node:test renvoie une promesse qu'on
  // n'attend jamais au niveau racine, c'est le fonctionnement prévu du coureur.
  {
    files: ['**/*.test.ts', 'scripts/db-test.mjs'],
    rules: { '@typescript-eslint/no-floating-promises': 'off' },
  },

  // Les scripts d'outillage tournent en Node, hors du graphe TypeScript.
  // `languageOptions` doit désactiver le service de projet ici même : le
  // redéclarer sans le faire écraserait ce que `disableTypeChecked` a posé.
  {
    files: ['scripts/**/*.mjs', 'packages/*/build.mjs', 'eslint.config.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: { projectService: false, project: null },
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        URL: 'readonly',
      },
    },
    // Fusion et non remplacement : `disableTypeChecked` éteint des dizaines de
    // règles par sa clé `rules`, qu'une redéclaration effacerait.
    rules: { ...tseslint.configs.disableTypeChecked.rules, 'no-undef': 'off' },
  },

  // `eslint-config-prettier` en dernier : il éteint les règles de mise en
  // forme, qui sont l'affaire de Prettier.
  prettier,
)
