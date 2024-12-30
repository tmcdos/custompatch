module.exports = {
  // https://eslint.org/docs/user-guide/configuring#configuration-cascading-and-hierarchy
  // This option interrupts the configuration hierarchy at this file
  // Remove this if you have a higher level ESLint config file (it usually happens into a monorepos)
  root: true,

  parserOptions: {
    ecmaVersion: 'latest', // Allows for the parsing of modern ECMAScript features
    sourceType: 'module' // Allows for the use of imports
  },

  env: {
    node: true,
    browser: false,
  },

  // Rules order is important, please avoid shuffling them
  extends: [
    // Base ESLint recommended rules
    'eslint:recommended',
    'standard',
  ],

  plugins: [
    'simple-import-sort',
    'import',
    'perfectionist',
  ],

  settings:
    {
      'import/resolver':
        {
          webpack: {},
          node: {},
        },
    },

  globals: {
    process: 'readonly',
    chrome: 'readonly'
  },

  // add your custom rules here
  rules: {

    // allow async-await
    'generator-star-spacing': 'off',
    'import/first': 'error',
    'import/named': 'error',
    'import/namespace': 'error',
    'import/default': 'error',
    'import/export': 'error',
    'import/extensions': 'off',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'import/no-unresolved': 'error',
    'import/no-extraneous-dependencies': 'error',
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    semi: ['error', 'always'],
    'spaced-comment': 'off',
    curly: ['error', 'all'],
    'no-var': ['error'],
    'brace-style': ['error', 'allman'],
    'space-before-function-paren': ['error', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always'
    }],
    'object-curly-newline': [
      'error',
      {
        ObjectExpression: {
          multiline: true,
          minProperties: 2,
          consistent: true
        },
        ObjectPattern: { multiline: true },
        ImportDeclaration: { multiline: true },
        ExportDeclaration: {
          multiline: true,
          minProperties: 3
        }
      }
    ],
    'object-property-newline': [
      'error',
      { allowAllPropertiesOnSameLine: false }
    ],
    'comma-dangle': [
      'error',
      {
        arrays: 'only-multiline',
        objects: 'only-multiline',
        imports: 'only-multiline',
        exports: 'never',
        functions: 'never'
      }
    ],
    quotes: [
      'error',
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true
      }
    ],
    'one-var': [
      'error',
      {
        uninitialized: 'always',
        initialized: 'never'
      }
    ],

    'perfectionist/sort-array-includes': ['error',
      {
        type: 'alphabetical',
        order: 'asc',
        ignoreCase: true,
        groupKind: 'literals-first',
      },
    ],
    'perfectionist/sort-switch-case': ['error',
      {
        type: 'alphabetical',
        order: 'asc',
        ignoreCase: true,
      },
    ],
    'perfectionist/sort-variable-declarations': ['error',
      {
        type: 'alphabetical',
        order: 'asc',
        ignoreCase: true,
      },
    ],

    'array-element-newline': ["error", "consistent"],
    'block-scoped-var': "error",
    //'class-methods-use-this': "error",
    'consistent-return': "error",
    'default-param-last': ["error"],
    'func-names': ["error", "as-needed"],
    'func-style': ["error", "declaration", { "allowArrowFunctions": true }],
    'getter-return': "error",
    'grouped-accessor-pairs': ["error", "getBeforeSet"],
    'max-statements-per-line': ["error", { "max": 1 }],
    'no-confusing-arrow': "error",
    'no-constant-binary-expression': "error",
    'no-constructor-return': "error",
    'no-dupe-else-if': "error",
    'no-lonely-if': "error",
    'no-loop-func': "error",
    'nonblock-statement-body-position': ["error", "beside"],
    'no-negated-in-lhs': "error",
    'no-new-native-nonconstructor': "error",
    'no-promise-executor-return': "error",
    'no-setter-return': "error",
    'no-shadow': "error",
    'no-spaced-func': "error",
    'no-unsafe-optional-chaining': ["error", { "disallowArithmeticOperators": true }],
    'no-useless-concat': "error",
    'radix': "error",
    'require-atomic-updates': "error",
    'require-await': "error",
    'require-yield': "error",
    'semi-style': ["error", "last"],
    'vars-on-top': "error",
  }
}
