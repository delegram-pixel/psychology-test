"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { X, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react"
import { BasicScaleInfo } from "./wizard-steps/basic-scale-info"
import { ResponseMappingStep } from "./wizard-steps/response-mapping-step"
import { ItemConfigurationStep } from "./wizard-steps/item-configuration-step"
import { ScoreInterpretationStep } from "./wizard-steps/score-interpretation-step"
import type { Scale, ScaleItem, ResponseMapping, InterpretationRange } from "@/lib/types"

interface ScaleWizardProps {
  onClose: () => void
}

export interface WizardData {
  basicInfo: Partial<Scale>
  items: ScaleItem[]
  mappings: ResponseMapping[]
  interpretations: InterpretationRange[]
}

export function ScaleWizard({ onClose }: ScaleWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState<WizardData>({
    basicInfo: {
      responseFormat: "text",
      scoringType: "sum",
      isPublic: false,
      isVerified: false,
    },
    items: [],
    mappings: [],
    interpretations: [],
  })

  const steps = [
    { id: 1, title: "Basic Information", description: "Scale name, description, and format" },
    { id: 2, title: "Response Mapping", description: "Define response options and values" },
    { id: 3, title: "Item Configuration", description: "Add questions and configure items" },
    { id: 4, title: "Score Interpretation", description: "Define score ranges and meanings" },
  ]

  const currentStepData = steps.find((step) => step.id === currentStep)
  const progress = (currentStep / steps.length) * 100

  const updateWizardData = <K extends keyof WizardData>(
    section: K,
    data: WizardData[K]
  ) => {
    setWizardData((prev) => ({
      ...prev,
      [section]: data,
    }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return wizardData.basicInfo.name && wizardData.basicInfo.description && wizardData.basicInfo.totalItems
      case 2:
        return wizardData.basicInfo.responseFormat === "numeric" || wizardData.mappings.length > 0
      case 3:
        return wizardData.items.length > 0
      case 4:
        return wizardData.interpretations.length > 0
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = () => {
    // Here you would save the scale to your data store
    console.log("[v0] Scale creation completed:", wizardData)
    alert("Scale created successfully! (This would save to database in production)")
    onClose()
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <BasicScaleInfo data={wizardData.basicInfo} onChange={(data) => updateWizardData("basicInfo", data)} />
      case 2:
        return (
          <ResponseMappingStep
            basicInfo={wizardData.basicInfo}
            mappings={wizardData.mappings}
            onChange={(data) => updateWizardData("mappings", data)}
          />
        )
      case 3:
        return (
          <ItemConfigurationStep
            basicInfo={wizardData.basicInfo}
            items={wizardData.items}
            onChange={(data) => updateWizardData("items", data)}
          />
        )
      case 4:
        return (
          <ScoreInterpretationStep
            basicInfo={wizardData.basicInfo}
            interpretations={wizardData.interpretations}
            onChange={(data) => updateWizardData("interpretations", data)}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Create New Scale</CardTitle>
              <CardDescription>
                Step {currentStep} of {steps.length}: {currentStepData?.title}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{currentStepData?.description}</p>
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <Card className="mb-6">
        <CardContent className="p-6">{renderStepContent()}</CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="gap-2 bg-transparent"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex gap-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.id === currentStep
                        ? "bg-primary/20 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.id < currentStep ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
              ))}
            </div>

            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={!canProceed()} className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Create Scale
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
