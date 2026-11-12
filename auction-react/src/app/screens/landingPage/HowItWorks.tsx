import React from "react";
import Box from "@mui/material/Box";
import Step from "@mui/material/Step";
import StepConnector from "@mui/material/StepConnector";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import SectionHeader from "./SectionHeader";

export default function HowItWorks() {
  const { t } = useTranslation();
  const steps: [string, string][] = [
    [t("howitworks.step1Title"), t("howitworks.step1Body")],
    [t("howitworks.step2Title"), t("howitworks.step2Body")],
    [t("howitworks.step3Title"), t("howitworks.step3Body")],
    [t("howitworks.step4Title"), t("howitworks.step4Body")],
    [t("howitworks.step5Title"), t("howitworks.step5Body")],
  ];

  return (
    <section className="landing__section--tight">
      <SectionHeader
        number={t("howitworks.number")}
        title={t("howitworks.title")}
        subtitle={t("howitworks.subtitle")}
      />
      <Box className="landing__steps" component="div">
        <Stepper
          alternativeLabel
          activeStep={-1}
          connector={<StepConnector className="landing__step-connector" />}
        >
          {steps.map(([title, body], i) => (
            <Step key={title} className="landing__step">
              <StepLabel
                icon={<span className="landing__step-index">{String(i + 1).padStart(2, "0")}</span>}
              >
                <Typography component="span" className="landing__step-title">
                  {title}
                </Typography>
                <Typography component="span" className="landing__step-body">
                  {body}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
    </section>
  );
}
