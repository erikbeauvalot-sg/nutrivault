---
name: advanced-elicitation
description: Advanced Elicitation
---

# advanced-elicitation

## Overview
Advanced Elicitation



## When to Use
This workflow can be run standalone and is designed for: advanced elicitation

## Instructions
# Advanced Elicitation

*Standalone workflow*

  

## Critical Instructions

> ⚠️ MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER
> ⚠️ DO NOT skip steps or change the sequence
> ⚠️ HALT immediately when halt-conditions are met
> ⚠️ Each action xml tag within step xml tag is a REQUIRED action to complete that step
> ⚠️ Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution
> ⚠️ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the `communication_language`

  

## When called from workflow

- When called during template workflow processing:
- 1. Receive or review the current section content that was just generated or
- 2. Apply elicitation methods iteratively to enhance that specific content
- 3. Return the enhanced version back when user selects 'x' to proceed and return back
- 4. The enhanced content replaces the original section content in the output document

  

## Workflow Steps

    

### Step 1: Method Registry Loading

      
- **Action:** Load and read {{methods}} and {{agent-party}}

      

**Csv Structure:**
- category: Method grouping (core, structural, risk, etc.)
- method_name: Display name for the method
- description: Rich explanation of what the method does, when to use it, and why it's valuable
- output_pattern: Flexible flow guide using → arrows (e.g., "analysis → insights → action")

      

**Context Analysis:**
- Use conversation history
- Analyze: content type, complexity, stakeholder needs, risk level, and creative potential

      

**Smart Selection:**
- 1. Analyze context: Content type, complexity, stakeholder needs, risk level, creative potential
- 2. Parse descriptions: Understand each method's purpose from the rich descriptions in CSV
- 3. Select 5 methods: Choose methods that best match the context based on their descriptions
- 4. Balance approach: Include mix of foundational and specialized techniques as appropriate

    

    

### Step 2: Present Options and Handle Responses

      

**Format:**
```
**Advanced Elicitation Options (If you launched Party Mode, they will participate randomly)**
        Choose a number (1-5), [r] to Reshuffle, [a] List All, or [x] to Proceed:

        1. [Method Name]
        2. [Method Name]
        3. [Method Name]
        4. [Method Name]
        5. [Method Name]
        r. Reshuffle the list with 5 new options
        a. List all methods with descriptions
        x. Proceed / No Further Actions
```

      

**Response Handling:**
```
**Case "1-5":**
  - Execute the selected method using its description from the CSV
  - Adapt the method's complexity and output format based on the current context
  - Apply the method creatively to the current section content being enhanced
  - Display the enhanced version showing what the method revealed or improved
  - CRITICAL: Ask the user if they would like to apply the changes to the doc (y/n/other) and HALT to await response.
  - CRITICAL: ONLY if Yes, apply the changes. IF No, discard your memory of the proposed changes. If any other reply, try best to follow the instructions given by the user.
  - CRITICAL: Re-present the same 1-5,r,x prompt to allow additional elicitations

        

**Case "r":**
  - Select 5 random methods from advanced-elicitation-methods.csv, present new list with same prompt format
  - When selecting, try to think and pick a diverse set of methods covering different categories and approaches, with 1 and 2 being potentially the most useful for the document or section being discovered

        

**Case "x":**
  - Complete elicitation and proceed
  - Return the fully enhanced content back to create-doc.md
  - The enhanced content becomes the final version for that section
  - Signal completion back to create-doc.md to continue with next section

        

**Case "a":**
  - List all methods with their descriptions from the CSV in a compact table
  - Allow user to select any method by name or number from the full list
  - After selection, execute the method as described in the n="1-5" case above

        

**Case "direct-feedback":**
  - Apply changes to current section content and re-present choices

        

**Case "multiple-numbers":**
  - Execute methods in sequence on the content, then re-offer choices
```

    

    

### Step 3: Execution Guidelines

      
- Method execution: Use the description from CSV to understand and apply each method
      
- Output pattern: Use the pattern as a flexible guide (e.g., "paths → evaluation → selection")
      
- Dynamic adaptation: Adjust complexity based on content needs (simple to sophisticated)
      
- Creative application: Interpret methods flexibly based on context while maintaining pattern consistency
      
- Focus on actionable insights
      
- Stay relevant: Tie elicitation to specific content being analyzed (the current section from the document being created unless user indicates otherwise)
      
- Identify personas: For single or multi-persona methods, clearly identify viewpoints, and use party members if available in memory already
      
- Critical loop behavior: Always re-offer the 1-5,r,a,x choices after each method execution
      
- Continue until user selects 'x' to proceed with enhanced content, confirm or ask the user what should be accepted from the session
      
- Each method application builds upon previous enhancements
      
- Content preservation: Track all enhancements made during elicitation
      
- Iterative enhancement: Each selected method (1-5) should:
      
- 1. Apply to the current enhanced version of the content
      
- 2. Show the improvements made
      
- 3. Return to the prompt for additional elicitations or completion

## Supporting Files

### Methods Reference
- [methods.csv](methods.csv) - 50 techniques/methods available
  - Columns: `num,category,method_name,description,output_pattern`