// lib/defaultTagStyles.ts

export interface TagStyle {
  name: string
  open_tag: string
  close_tag: string
  description: string
  css_class: string
  ignored: boolean
}

export const defaultTagStyles: TagStyle[] = [
  {
    name: "b",
    open_tag: "<b>",
    close_tag: "</b>",
    description: "Bold text",
    css_class: "font-bold",
    ignored: false,
  },
  {
    name: "i",
    open_tag: "<i>",
    close_tag: "</i>",
    description: "Italic text",
    css_class: "italic",
    ignored: false,
  },
  {
    name: "u",
    open_tag: "<u>",
    close_tag: "</u>",
    description: "Underlined text",
    css_class: "underline",
    ignored: false,
  },
  {
    name: "FN",
    open_tag: "<FN>",
    close_tag: "</FN>",
    description: "Footnote",
    css_class: "text-blue-500",
    ignored: false,
  },
  {
    name: "RF",
    open_tag: "<RF>",
    close_tag: "<Rf>",
    description: "Reference footnote start",
    css_class: "text-blue-500",
    ignored: false,
  },
  {
    name: "Rf",
    open_tag: "<Rf>",
    close_tag: "</RF>",
    description: "Reference footnote end",
    css_class: "text-blue-500",
    ignored: false,
  },
  {
    name: "CM",
    open_tag: "<CM>",
    close_tag: "</CM>",
    description: "Chapter marker",
    css_class: "",
    ignored: true,
  },
  {
    name: "V",
    open_tag: "<V>",
    close_tag: "</V>",
    description: "Verse number",
    css_class: "font-bold text-sm mr-2",
    ignored: false,
  },
  {
    name: "CI",
    open_tag: "<CI>",
    close_tag: "</CI>",
    description: "Content indentation",
    css_class: "",
    ignored: false,
  },
  {
    name: "PI1",
    open_tag: "<PI1>",
    close_tag: "</PI1>",
    description: "Paragraph indentation level 1",
    css_class: "ml-6 inline-block",
    ignored: false,
  },
]
