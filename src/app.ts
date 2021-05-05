import { Command } from 'commander';
import Web3 from 'web3';
import { Transaction } from '@ethereumjs/tx'

const app = new Command();

app
  .option('-b --byte-code <byte_code>', 'contract byte code')
  .option('-n --node <node_uri>', 'eth node uri')
  .option('-k --key <private_key>', 'private key');

app.parse(process.argv);

const abi_raw = '[{"inputs":[],"name":"send","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}]'

const args = app.opts();

const main = async () => {
    let web3 = new Web3(args.node);
    let abi = JSON.parse(abi_raw);
    let byteCode = `0x${args.byteCode}`;
    let account = web3.eth.accounts.privateKeyToAccount(`0x${args.key}`);
    let gas = await web3.eth.getBlock("latest")
    let gasP = web3.utils.toHex(web3.utils.toWei('70', 'gwei'));

    let contract = new web3.eth.Contract(abi);

    async function send(transaction: any, to?: string) {
        let options = {
            from: account.address,
            to  : to,
            data: transaction.encodeABI(),
            gas : gas.gasLimit,
            gasPrice: gasP
        };
        let signedTransaction = await web3.eth.accounts.signTransaction(options, `0x${args.key}`);
        return await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction!!);
    }

    let deployed = await send(contract.deploy({data: byteCode}));
    console.log("Deployed contract address:", deployed.contractAddress);

    const tx = await account.signTransaction({
        "from": account.address,
        "nonce": await web3.eth.getTransactionCount(account.address),
        "gasPrice": gasP,
        "gas": web3.utils.toHex(gas.gasLimit),
        "to": deployed.contractAddress,
        "value": web3.utils.toHex(web3.utils.toWei('0.00005', 'ether')),
        "chainId": 3,
    });

    const txid = await web3.eth.sendSignedTransaction(tx.rawTransaction!!);
    console.log("sent wei to contract. hash:", txid.transactionHash)
    contract = new web3.eth.Contract(abi, deployed.contractAddress);

    let sendTx = await send(contract.methods.send(), deployed.contractAddress);
    console.log("Executed contract! TxHash:", sendTx.transactionHash)
}

main()