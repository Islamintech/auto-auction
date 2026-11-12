import React from "react";
import { useTranslation } from "react-i18next";
import { Box, Container, Stack, Tabs } from "@mui/material";
import Typography from "@mui/material/Typography";
import Tab from "@mui/material/Tab";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Button from "@mui/material/Button";
import TabContext from "@mui/lab/TabContext";
import TabPanel from "@mui/lab/TabPanel";
import { CONTACT } from "../../../lib/contact";
import "../../../css/help.css";

export default function HelpPage() {
  const { t } = useTranslation();
  const faq = t("faq.items", { returnObjects: true }) as {
    question: string;
    answer: string;
  }[];
  const [value, setValue] = React.useState("2");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");

  /** HANDLERS **/
  const handleChange = (e: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const body = encodeURIComponent(
      `${CONTACT.companyName} — ${name || "website"}\n\n${message}${email ? `\n\n(${email})` : ""}`
    );
    window.location.href = `sms:${CONTACT.phoneRaw}?body=${body}`;
  };

  return (
    <div className={"help-page"}>
      <Container className={"help-container"}>
        <TabContext value={value}>
          <Box className={"help-menu"}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={value}
                onChange={handleChange}
                aria-label={t("a11y.helpTabs")}
                className={"table_list"}
              >
                <Tab label={t("help.faq")} value={"2"} />
                <Tab label={t("help.contact")} value={"3"} />
              </Tabs>
            </Box>
          </Box>
          <Stack>
            <Stack className={"help-main-content"}>
              <TabPanel value={"2"}>
                <Stack className={"accordion-menu"}>
                  {faq.map((value, number) => {
                    return (
                      <Accordion key={number}>
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          aria-controls="panel1a-content"
                          id="panel1a-header"
                        >
                          <Typography>{value.question}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography>{value.answer}</Typography>
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Stack>
              </TabPanel>
              <TabPanel value={"3"}>
                <Stack className={"admin-letter-box"}>
                  <Stack className={"admin-letter-container"}>
                    <Box className={"admin-letter-frame"}>
                      <span>{t("help.contactTitle")}</span>
                      <p>{t("help.contactSub")}</p>
                    </Box>
                    <form
                      onSubmit={handleSend}
                      className={"admin-letter-frame"}
                    >
                      <div className={"admin-input-box"}>
                        <label>{t("help.yourName")}</label>
                        <input
                          type={"text"}
                          name={"memberNick"}
                          placeholder={t("help.namePh")}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div className={"admin-input-box"}>
                        <label>{t("help.yourEmail")}</label>
                        <input
                          type={"email"}
                          name={"memberEmail"}
                          placeholder={t("help.emailPh")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className={"admin-input-box"}>
                        <label>{t("help.message")}</label>
                        <textarea
                          name={"memberMsg"}
                          placeholder={t("help.messagePh")}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        ></textarea>
                      </div>
                      <Box
                        display={"flex"}
                        justifyContent={"flex-end"}
                        sx={{ mt: "30px" }}
                      >
                        <Button type={"submit"} variant="contained" disabled={!message.trim()}>
                          {t("help.send")}
                        </Button>
                      </Box>
                    </form>
                  </Stack>
                </Stack>
              </TabPanel>
            </Stack>
          </Stack>
        </TabContext>
      </Container>
    </div>
  );
}
