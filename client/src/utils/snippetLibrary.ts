
import { languages } from 'monaco-editor';

type CompletionItem = languages.CompletionItem;

// Helper to create snippets easily
const createSnippet = (
  monaco: any,
  label: string,
  insertText: string,
  documentation: string,
  kind: any
): CompletionItem => ({
  label,
  kind,
  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
  insertText,
  documentation,
  range: undefined as any // Monaco handles range automatically if undefined
});

export const getSnippetsForLanguage = (monaco: any, lang: string): CompletionItem[] => {
  const snippets: CompletionItem[] = [];
  const K = monaco.languages.CompletionItemKind;

  // --- JAVASCRIPT / TYPESCRIPT / REACT ---
  if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(lang)) {
    snippets.push(
      createSnippet(monaco, 'clg', 'console.log($1);', 'Console Log', K.Function),
      createSnippet(monaco, 'imp', 'import { $2 } from "$1";', 'Import Named', K.Module),
      createSnippet(monaco, 'imd', 'import $2 from "$1";', 'Import Default', K.Module),
      createSnippet(monaco, 'fun', 'const $1 = ($2) => {\n\t$0\n}', 'Arrow Function', K.Function),
      createSnippet(monaco, 'prom', 'new Promise((resolve, reject) => {\n\t$0\n});', 'New Promise', K.Class),
      createSnippet(monaco, 'try', 'try {\n\t$0\n} catch (error) {\n\tconsole.error(error);\n}', 'Try Catch Block', K.Snippet),
      createSnippet(monaco, 'for', 'for (let i = 0; i < ${1:array}.length; i++) {\n\tconst ${2:element} = ${1:array}[i];\n\t$0\n}', 'For Loop', K.Snippet),
      createSnippet(monaco, 'map', '${1:array}.map((${2:item}) => (\n\t$0\n))', 'Array Map', K.Function),
    );

    // React Specific
    if (lang.includes('react') || lang.includes('tsx') || lang.includes('jsx')) {
      snippets.push(
        createSnippet(monaco, 'rafce', 'import React from \'react\';\n\nconst ${1:ComponentName} = () => {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n};\n\nexport default ${1:ComponentName};', 'React Arrow Function Component', K.Snippet),
        createSnippet(monaco, 'useS', 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState($2);', 'useState Hook', K.Function),
        createSnippet(monaco, 'useE', 'useEffect(() => {\n\t$0\n}, [${1:dependencies}]);', 'useEffect Hook', K.Function),
      );
    }
  }

  // --- PYTHON ---
  if (lang === 'python') {
    snippets.push(
      createSnippet(monaco, 'def', 'def ${1:function_name}(${2:args}):\n\t"""${3:docstring}"""\n\t$0', 'Function Definition', K.Function),
      createSnippet(monaco, 'class', 'class ${1:ClassName}:\n\tdef __init__(self, ${2:args}):\n\t\tself.${3:arg} = ${3:arg}\n\t\t$0', 'Class Definition', K.Class),
      createSnippet(monaco, 'ifmain', 'if __name__ == "__main__":\n\t${1:main()}', 'If Name == Main', K.Snippet),
      createSnippet(monaco, 'try', 'try:\n\t$1\nexcept ${2:Exception} as e:\n\tprint(e)', 'Try Except', K.Snippet),
      createSnippet(monaco, 'for', 'for ${1:item} in ${2:iterable}:\n\t$0', 'For Loop', K.Snippet),
      createSnippet(monaco, 'pr', 'print($1)', 'Print', K.Function)
    );
  }

  // --- HTML ---
  if (lang === 'html') {
    snippets.push(
      createSnippet(monaco, 'div', '<div class="$1">\n\t$0\n</div>', 'Div Tag', K.Snippet),
      createSnippet(monaco, 'html5', '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>', 'HTML5 Boilerplate', K.Snippet)
    );
  }

  // --- CSS / TAILWIND ---
  if (lang === 'css') {
    snippets.push(
      createSnippet(monaco, 'flex', 'display: flex;\nalign-items: center;\njustify-content: center;', 'Flex Center', K.Snippet),
      createSnippet(monaco, 'media', '@media (max-width: ${1:768px}) {\n\t$0\n}', 'Media Query', K.Snippet)
    );
  }

  return snippets;
};
