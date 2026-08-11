Analyze each of the following sentences written in {{SOURCE_LANG}} and create a token-level gloss in {{TARGET_LANG}} for each sentence.
{{READING_INSTRUCTION}}
Rules:
- Keep morphemic granularity as close as possible.
- Do not include punctuation marks as tokens.
- Ensure gloss is contextually accurate.
- Ignore verse numbers.
- Return one gloss entry per input sentence, in the same order, inside the "glosses" array.
**Examples:**
1. In Spanish to English, "No lo sé, sin embargo lo pensaré." would be segmented into six tokens: "No" (gloss: "not"), "lo" (gloss: "it"), "sé" (gloss: "know"), " Sin embargo" (gloss: "however"), "lo" (gloss: "it"), "pensaré" (gloss: "will think").
Notice how the comma "," is not included as a separate token, equal case with the final dot "." is not included. And "sin embargo" are treated as one morphemes with the same gloss "however".
2. In Chinese to English, "我喜欢看电视。" would be segmented into four tokens: "我" (pinyin: "wǒ", gloss: "I"), "喜欢" (pinyin: "xǐhuan", gloss: "like"), "看" (pinyin: "kàn", gloss: "watch"), "电视" (pinyin: "diànshì", gloss: "TV").
The punctuation mark "。" is not included as a token. Notice how in the compound word "喜欢", the hanzi "欢" is pronounced with a neutral tone (轻声), so it is written huan instead of huān.
Sentences:
{{SENTENCES}}
